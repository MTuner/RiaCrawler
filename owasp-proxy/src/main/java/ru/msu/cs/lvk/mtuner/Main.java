package ru.msu.cs.lvk.mtuner;
import java.io.*;

import org.springframework.context.ApplicationContext;
import org.springframework.context.support.ClassPathXmlApplicationContext;


public class Main {
    
    public static void main(String[] args) {
        ApplicationContext context = new ClassPathXmlApplicationContext("config.xml");
        GlobalConfigurator config = (GlobalConfigurator) context.getBean("configurator");
        
        CachingProxy mainListener = new CachingProxy(config);
        PrimitiveHttpServer server = new PrimitiveHttpServer(config.getOperationalServerPort());
        try {
            server.start();
            mainListener.startProxy();
            
            String str;
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            do
            {
                str = reader.readLine();
            } while (!str.equals("quit"));
            
            mainListener.stopProxy();
            server.stop();
        } catch (IOException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
