package ru.msu.cs.lvk.mtuner;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletException;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;


class PrimitiveHttpHandler extends AbstractHandler
{
    public void handle(String target,
                       Request baseRequest,
                       HttpServletRequest request,
                       HttpServletResponse response)
            throws IOException, ServletException
    {
        response.setContentType("text/html;charset=utf-8");
        response.setStatus(HttpServletResponse.SC_OK);
        baseRequest.setHandled(true);
        response.getWriter().println("<h1>Hello World</h1>");
    }
}


public class PrimitiveHttpServer
{
    private int listenPort;
    private Server server = null;

    PrimitiveHttpServer(int listenPort) {
        this.listenPort = listenPort;
    }

    void start() throws Exception {
        Server server = new Server(this.listenPort);
        server.setHandler(new PrimitiveHttpHandler());

        server.start();
    }

    void stop() throws Exception {
        server.stop();
    }
}
