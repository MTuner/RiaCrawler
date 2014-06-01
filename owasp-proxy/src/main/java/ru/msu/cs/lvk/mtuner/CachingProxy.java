package ru.msu.cs.lvk.mtuner;
import java.io.*;
import java.net.*;
import java.security.GeneralSecurityException;
import java.util.*;
import java.util.logging.ConsoleHandler;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.owasp.proxy.daemon.Proxy;
import org.owasp.proxy.daemon.ServerGroup;
import org.owasp.proxy.http.BufferedRequest;
import org.owasp.proxy.http.MutableBufferedRequest;
import org.owasp.proxy.http.MutableBufferedResponse;
import org.owasp.proxy.http.MessageFormatException;
import org.owasp.proxy.http.MutableRequestHeader;
import org.owasp.proxy.http.MutableResponseHeader;
import org.owasp.proxy.http.RequestHeader;
import org.owasp.proxy.http.client.HttpClient;
import org.owasp.proxy.http.server.BufferedMessageInterceptor;
import org.owasp.proxy.http.server.BufferingHttpRequestHandler;
import org.owasp.proxy.http.server.DefaultHttpRequestHandler;
import org.owasp.proxy.http.server.HttpProxyConnectionHandler;
import org.owasp.proxy.http.server.HttpRequestHandler;
import org.owasp.proxy.http.server.LoggingHttpRequestHandler;
import org.owasp.proxy.util.TextFormatter;

public class CachingProxy {
    private Proxy mainProxy;
    private InetSocketAddress mainListener = null;

    private GlobalConfigurator config;
    private CacheManager cacheManager = null;
    private static Logger logger = Logger.getLogger("CachingProxy");

    public CachingProxy(GlobalConfigurator config) {
        this.config = config;
        initializeLogger();

        this.cacheManager = new CacheManager(config);
    }


    private void initializeLogger() {
        logger.setLevel(Level.ALL);
        logger.setUseParentHandlers(false);
        
        Handler defaultConsoleHandler = new ConsoleHandler();
        defaultConsoleHandler.setFormatter(new TextFormatter());
        defaultConsoleHandler.setLevel(Level.ALL);
        logger.addHandler(defaultConsoleHandler);

        Handler additionalHandler = config.getLogHandler();
        if (additionalHandler != null) {
        additionalHandler.setFormatter(new TextFormatter());
            additionalHandler.setLevel(Level.CONFIG);
            logger.addHandler(additionalHandler);
        }
    }


    public void startProxy() throws GeneralSecurityException, IOException {
        int port = config.getProxyListenPort();
        
        try {
            mainListener = new InetSocketAddress("localhost", port);
        } catch (NumberFormatException nfe) {
            usage();
            return;
        }
        
        String proxy = config.getProxyUpstreamConfig();
        final ProxySelector ps = getProxySelector(proxy);
        
        DefaultHttpRequestHandler drh = new DefaultHttpRequestHandler() {
            @Override
            protected HttpClient createClient() {
                HttpClient client = super.createClient();
                client.setProxySelector(ps);
                client.setSoTimeout(90000);
                return client;
            }
        };
        
        ServerGroup sg = new ServerGroup();
        sg.addServer(mainListener);
        drh.setServerGroup(sg);
        
        HttpRequestHandler rh = drh;
        rh = new LoggingHttpRequestHandler(rh);

        BufferedMessageInterceptor bmi = setInterseptor();    
        
        rh = new BufferingHttpRequestHandler(rh, bmi, 10240);
        HttpProxyConnectionHandler hpch = new HttpProxyConnectionHandler(rh);
        
        mainProxy = new Proxy(mainListener, hpch, null);
        mainProxy.setSocketTimeout(90000);
        mainProxy.start();
        
        logger.config("Proxy: Listener started on " + mainListener);
        if (proxy != "DIRECT")
            logger.config("Proxy: Upstream proxy:" + proxy);
    }
    
    
    private void usage() {
        logger.severe("Can't start proxy. Check the \"proxyListenPort\" parameter int the config file");
    }
    
    
    //install proxy of given type and get proxy selector
    private ProxySelector getProxySelector(String proxy) {
        final java.net.Proxy upstream;
        if ("DIRECT".equals(proxy)) {
            upstream = java.net.Proxy.NO_PROXY;
        } else {
            java.net.Proxy.Type type = null;
            if (proxy.startsWith("PROXY ")) {
                type = java.net.Proxy.Type.HTTP;
            } else if (proxy.startsWith("SOCKS ")) {
                type = java.net.Proxy.Type.SOCKS;
            } else {
                throw new IllegalArgumentException("Unknown Proxy type: " + proxy);
            }

            proxy = proxy.substring(6); // "SOCKS " or "PROXY "
            int c = proxy.indexOf(':');
            if (c == -1)
                throw new IllegalArgumentException("Illegal proxy address: " + proxy);
            InetSocketAddress addr = new InetSocketAddress(proxy.substring(0, c), Integer.parseInt(proxy.substring(c + 1)));
            upstream = new java.net.Proxy(type, addr);
        }

        ProxySelector ps = new ProxySelector() {
            @Override
            public void connectFailed(URI uri, SocketAddress sa, IOException ioe) {
                logger.info("Proxy connection to " + uri + " via " + sa + " failed! " + ioe.getLocalizedMessage());
            }

            @Override
            public List<java.net.Proxy> select(URI uri) {
                return Arrays.asList(upstream);
            }
        };
        
        return ps;
    }
    
    
    //set request/response interception 
    private BufferedMessageInterceptor setInterseptor() {
        BufferedMessageInterceptor bmi = new BufferedMessageInterceptor() {
            @Override
            public Action directRequest(MutableRequestHeader request) {

                return Action.BUFFER;
            }

            @Override
            public Action directResponse(RequestHeader request, MutableResponseHeader response) {
                return Action.BUFFER;
            }

            public void processRequest(final MutableBufferedRequest request) {
                try {
                    logRequestInfo(request);
                    cacheManager.handleRequest(request);
                } catch (MessageFormatException e) {
                    logger.severe("Handling request exception: " + e.toString());
                    e.printStackTrace();
                }
            }

            public void processResponse(final BufferedRequest request, final MutableBufferedResponse response) {
                try {
                    cacheManager.handleResponse(request, response);
                } catch (MessageFormatException e) {
                    logger.severe("Handling response exception: " + e.toString());
                    e.printStackTrace();
                }
            }
        };
        return bmi;
    }
    
    
    public void stopProxy() {
        mainProxy.stop();
        logger.info("Proxy: Proxy on " + mainListener + " was stopped");
    }
    
    
    private void logRequestInfo(MutableBufferedRequest request) throws MessageFormatException {
        logger.info("REQUEST: " + request.getHeader("Host") + " " + request.getStartLine());
    }
}