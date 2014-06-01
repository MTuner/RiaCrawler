package ru.msu.cs.lvk.mtuner;

import java.util.logging.Handler;

public class GlobalConfigurator {
    private int proxyListenPort = 8095;
    private String proxyUpstreamConfig = "DIRECT";

    private String operationalCommand = "_CRAWLER_SERVICE_";
    private String useCachedHeader = "USE_CACHED";
    private String responseCacheHeader = "CRAWLER_CACHE_INFO";
    private int operationalServerPort = 8099;

    private Handler logHandler = null;
    
    
    public void setProxyListenPort(int proxyListenPort) {
        this.proxyListenPort = proxyListenPort;
    }
    
    public int getProxyListenPort() {
        return proxyListenPort;
    }
    
    public void setLogHandler(Handler handler) {
        this.logHandler = handler;
    }
    
    public Handler getLogHandler() {
        return logHandler;
    }
    
    public String getProxyUpstreamConfig() {
        return proxyUpstreamConfig;
    }

    public void setProxyUpstreamConfig(String proxyUpstreamConfig) {
        this.proxyUpstreamConfig = proxyUpstreamConfig;
    }

    public String getOperationalCommand() {
        return operationalCommand;
    }

    public void setOperationalCommand(String operationalCommand) {
        this.operationalCommand = operationalCommand;
    }

    public String getUseCachedHeader() {
        return useCachedHeader;
    }

    public void setUseCachedHeader(String useCachedHeader) {
        this.useCachedHeader = useCachedHeader;
    }

    public int getOperationalServerPort() {
        return operationalServerPort;
    }

    public void setOperationalServerPort(int operationalServerPort) {
        this.operationalServerPort = operationalServerPort;
    }

    public String getResponseCacheHeader() {
        return responseCacheHeader;
    }

    public void setResponseCacheHeader(String responseCacheHeader) {
        this.responseCacheHeader = responseCacheHeader;
    }
}
