package ru.msu.cs.lvk.mtuner;


import org.owasp.proxy.http.BufferedRequest;
import org.owasp.proxy.http.MessageFormatException;
import org.owasp.proxy.http.MutableBufferedRequest;
import org.owasp.proxy.http.MutableBufferedResponse;

import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.logging.Logger;

public class CacheManager {
    private GlobalConfigurator config;
    private static Logger logger = Logger.getLogger("CachingProxy");

    // Requests/responses handler parameters
    private HashMap<Integer, RequestCache> requests = new HashMap<Integer, RequestCache>();
    private int requestCount = 0;
    private int[] lastCachedRequest = null;

    private String operationalCommand;
    private String useCachedHeader;
    private String responseCacheHeader;
    private int operationalServerPort;

    private HashMap<Integer, Integer> cacheMap = new HashMap<Integer, Integer>(); // <requestId, responseId>


    public CacheManager(GlobalConfigurator config) {
        this.config = config;

        initializeParameters();
    }


    private void initializeParameters() {
        this.operationalCommand = config.getOperationalCommand();
        this.useCachedHeader = config.getUseCachedHeader();
        this.responseCacheHeader = config.getResponseCacheHeader();
        this.operationalServerPort = config.getOperationalServerPort();
    }


    public void handleRequest(MutableBufferedRequest request) throws MessageFormatException {
        // The service operational request, or USE_CACHED header specified
        if (request.getStartLine().contains(this.operationalCommand)
                || request.getHeader(this.useCachedHeader) != null)
        {
            changeTargetToOperationalServer(request);
        }
        else {
            Integer[] cachedRequest = searchForCurrentlyCached(request);
            if (cachedRequest != null) {
                request.setHeader(this.useCachedHeader, cachedRequest[0] + "=" + cachedRequest[1]);
                changeTargetToOperationalServer(request);
            }
        }
    }


    public void handleResponse(BufferedRequest request, MutableBufferedResponse response) throws MessageFormatException {
        logger.info("handle response...");
        if (request.getStartLine().contains(this.operationalCommand)) {
            processServiceCommand(request);

            response.setStatus("200");
        }
        else {
            // Caching is specified
            if ((request.getTarget().getHostName().equals("127.0.0.1") || request.getTarget().getHostName().equals("localhost"))
                    && request.getTarget().getPort() == operationalServerPort)
                replaceResponseFromCache(request, response);
            else
                newCachedResponse(request, response);
        }
    }


    private synchronized void replaceResponseFromCache(BufferedRequest request, MutableBufferedResponse response) throws MessageFormatException {
        String[] pair = request.getHeader(useCachedHeader).split("=");
        Integer requestId = Integer.valueOf(pair[0]);
        Integer responseId = Integer.valueOf(pair[1]);

        // make response "copy"
        RequestCache cachedRequest = requests.get(requestId);
        if (cachedRequest != null) {
            MutableBufferedResponse cachedResponse = cachedRequest.getResponse(responseId);
            if (cachedResponse != null) {
                response.setContent(cachedResponse.getContent());
                response.setHeader(cachedResponse.getHeader());
                response.setHeaders(cachedResponse.getHeaders());
                response.setReason(cachedResponse.getReason());
                response.setStartLine(cachedResponse.getStartLine());
                response.setStatus(cachedResponse.getStatus());
            } else {
                logger.warning("Null response reference: " + "requestId: " + requestId + " responseId " + responseId);
            }
        } else {
            logger.warning("Null response reference: " + "requestId: " + requestId + " responseId " + responseId);
        }

        addResponseCacheHeader(response, requestId, responseId);
    }


    private synchronized void newCachedResponse(BufferedRequest request, MutableBufferedResponse response) throws MessageFormatException {
        Integer requestId = searchForAlreadyExisted(request);
        if (requestId == null) {
            RequestCache requestCache = new RequestCache(requestCount++, request);
            requestId = requestCache.id();
            requests.put(requestId, requestCache);
        }

        Integer responseId = requests.get(requestId).addResponse(response);
        addResponseCacheHeader(response, requestId, responseId);
    }


    private void addResponseCacheHeader(MutableBufferedResponse response, Integer requestId, Integer responseId) throws MessageFormatException {
        response.setHeader(responseCacheHeader, requestId + "=" + responseId);
    }


    private synchronized Integer[] searchForCurrentlyCached(MutableBufferedRequest request) throws MessageFormatException {
        Integer[] found = null;
        for (Integer requestId : cacheMap.keySet()) {
            if (requests.get(requestId).isEqualToRequest(request)) {
                found = new Integer[2];
                found[0] = requestId;
                found[1] = cacheMap.get(requestId);
                break;
            }
        }

        return found;
    }


    private synchronized Integer searchForAlreadyExisted(BufferedRequest request) throws MessageFormatException {
        Integer found = null;
        for (Integer requestId : requests.keySet()) {
            if (requests.get(requestId).isEqualToRequest(request)) {
                found = requestId;
                break;
            }
        }

        return found;
    }


    private void changeTargetToOperationalServer(MutableBufferedRequest request) throws MessageFormatException {
        request.setTarget(new InetSocketAddress("127.0.0.1", operationalServerPort));
        request.setHeader("Host", "127.0.0.1:" + operationalServerPort);
    }


    private void processServiceCommand(BufferedRequest request) throws MessageFormatException {
        logger.info("processServiceCommand" + request.getStartLine());

        String method = request.getMethod();
        String content;
        if (method.equalsIgnoreCase("post")) {
            content = new String(request.getContent());
        } else {
            content = request.getStartLine().substring(request.getStartLine().indexOf("?")+1,
                    request.getStartLine().indexOf(" ", request.getStartLine().indexOf("?")));
        }
        String[] commandList = content.split("\n|&");

        for (int i = 0; i < commandList.length; ++i) {
            String[] list = commandList[i].split(":");

            String command = list[0];
            logger.info("command: " + command);
            String parameters = "";

            if (list.length > 1)
                parameters = list[1].trim();

            if (command.equalsIgnoreCase("useCached"))
                processUseCachedCommand(parameters);
            else if (command.equalsIgnoreCase("newCached"))
                processNewCachedCommand(parameters);
            else if (command.equalsIgnoreCase("disable"))
                processDisableCommand(parameters);
            else if (command.equalsIgnoreCase("delete"))
                processDeleteCommand(parameters);
            else if (command.equalsIgnoreCase("deleteLast"))
                processDeleteLastCommand();
            else if (command.equalsIgnoreCase("reset"))
                processResetCommand();
        }
    }

    private void processResetCommand() {
        logger.info("reset all the stuff");
        requests.clear();
        requestCount = 0;
        lastCachedRequest = null;
        cacheMap.clear();
    }

    private synchronized void processUseCachedCommand(String parameters) {
        if (parameters == "")
            return;

        String[] pairs = parameters.split(",");
        for (String pair : pairs) {
            Integer requestId = Integer.valueOf(pair.split("=")[0].trim());
            Integer responseId = Integer.valueOf(pair.split("=")[1].trim());

            cacheMap.put(requestId, responseId);
        }
    }


    private synchronized void processNewCachedCommand(String parameters) {
        cacheMap.clear();

        String[] pairs = parameters.split(",");
        for (String pair : pairs) {
            Integer requestId = Integer.valueOf(pair.split("=")[0].trim());
            Integer responseId = Integer.valueOf(pair.split("=")[1].trim());

            cacheMap.put(requestId, responseId);
        }
    }


    private synchronized void processDisableCommand(String parameters) {
        String[] ids = parameters.split(",");
        for (String idString : ids) {
            Integer id = Integer.valueOf(idString.trim());
            cacheMap.remove(id);
        }
    }


    private synchronized void processDeleteCommand(String parameters) {
        String[] pairs = parameters.split(",");
        for (String toDelete : pairs) {
            if (toDelete.split("=").length > 1) {
                Integer requestId = Integer.valueOf(toDelete.split("=")[0].trim());
                Integer responseId = Integer.valueOf(toDelete.split("=")[1].trim());

                requests.get(requestId).removeResponse(responseId);
                if (requests.get(requestId).responseCount() == 0)
                    requests.remove(requestId);
            } else {
                Integer requestId = Integer.valueOf(toDelete.trim());
                requests.remove(requestId);
            }
        }
    }


    private synchronized void processDeleteLastCommand() {
        if (this.lastCachedRequest != null) {
            Integer requestId = this.lastCachedRequest[0];
            Integer responseId = this.lastCachedRequest[1];

            requests.get(requestId).removeResponse(responseId);
            if (requests.get(requestId).responseCount() == 0)
                requests.remove(requestId);
        }
    }
}
