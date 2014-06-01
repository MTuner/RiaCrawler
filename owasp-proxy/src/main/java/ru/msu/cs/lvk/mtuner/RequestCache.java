package ru.msu.cs.lvk.mtuner;

import java.util.Arrays;
import java.util.HashMap;

import org.owasp.proxy.http.BufferedResponse;
import org.owasp.proxy.http.BufferedRequest;
import org.owasp.proxy.http.MessageFormatException;
import org.owasp.proxy.http.MutableBufferedResponse;


public class RequestCache {
    private int id;
    private HashMap<Integer, MutableBufferedResponse> responses;
    private BufferedRequest request;
    private int responseCount = 0;

    RequestCache(int id, BufferedRequest request) {
        this.id = id;
        this.responses = new HashMap<Integer, MutableBufferedResponse>();
        this.responseCount = 0;
        this.request = request;
    }

    public int id() {
        return this.id;
    }

    public int addResponse(MutableBufferedResponse response) {
        Integer responseId = Integer.valueOf(responseCount++);
        responses.put(responseId, response);

        return responseId;
    }

    public MutableBufferedResponse getResponse(int id) {
        return responses.get(Integer.valueOf(id));
    }

    public boolean isEqualToRequest(BufferedRequest request) {
        try {
            return (this.request.getStartLine().equals(request.getStartLine())
                    && this.request.getHeader("Host").equals(request.getHeader("Host"))
                    && Arrays.equals(this.request.getContent(), request.getContent()));
        } catch (MessageFormatException e) {
            e.printStackTrace();
            return false;
        }
    }

    public void removeResponse(int responseId) {
        responses.remove(responseId);
    }

    public int responseCount() {
        return responses.size();
    }
}
