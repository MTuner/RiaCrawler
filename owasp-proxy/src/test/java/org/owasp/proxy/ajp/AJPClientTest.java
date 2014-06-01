/*
 * This file is part of the OWASP Proxy, a free intercepting proxy library.
 * Copyright (C) 2008-2010 Rogan Dawes <rogan@dawes.za.net>
 * 
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 * 
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to:
 * The Free Software Foundation, Inc., 
 * 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 *
 */

package org.owasp.proxy.ajp;

import org.junit.Ignore;
import org.junit.Test;
import org.owasp.proxy.daemon.Server;
import org.owasp.proxy.http.*;
import org.owasp.proxy.util.AsciiString;

import java.io.*;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.cert.X509Certificate;
import java.util.Enumeration;

public class AJPClientTest {

	private static X509Certificate loadCertificate(InputStream in,
			char[] password) throws GeneralSecurityException, IOException {
		KeyStore ks = KeyStore.getInstance("PKCS12");
		ks.load(in, password);
		Enumeration<String> aliases = ks.aliases();
		String alias = null;
		if (aliases.hasMoreElements())
			alias = aliases.nextElement();
		return (X509Certificate) ks.getCertificate(alias);
	}

	private AJPRequestHandler handler = new AJPRequestHandler() {
		public void dispose() throws IOException {
		}

		public StreamingResponse handleRequest(InetAddress source,
				AJPRequest request) throws IOException, MessageFormatException {
			StreamingResponse resp = new StreamingResponse.Impl();
			// System.out.println(request.toString());
			String cl = request.getHeader("Content-Length");
			if (cl != null) {
				int len = Integer.parseInt(cl);
				validatePayload(len, request.getContent());
				resp.setHeader(AsciiString
						.getBytes("HTTP/1.1 200 Ok\r\nContent-Length: " + cl
								+ "\r\n\r\n"));
				resp.setContent(generatePayload(len));
			} else {
				resp
						.setHeader(AsciiString
								.getBytes("HTTP/1.0 200 Ok\r\nContent-Length: 16\r\n\r\n"));
				resp.setContent(new ByteArrayInputStream(AsciiString
						.getBytes("0123456789ABCDEF")));
			}
			return resp;
		}
	};

	@Test
	@Ignore("Requires an AJP server on the other end")
	public void testCertificate() throws Exception {
		InetSocketAddress ajp = new InetSocketAddress("localhost", 8009);
		AJPClient connection = new AJPClient();
		connection.connect(ajp);
		AJPProperties properties = connection.getProperties();
		properties.getRequestAttributes().put("w00t", "WAIT");
		InputStream in = AJPClientTest.class.getClassLoader()
				.getResourceAsStream("org/owasp/proxy/daemon/server.p12");
		if (in == null) {
			System.err.println("Can't find keystore");
			return;
		}
		X509Certificate cert = loadCertificate(in, "password".toCharArray());
		properties.setSslCert(cert);
		properties.setSslCipher("TLS_DHE_DSS_WITH_AES_128_CBC_SHA");
		properties.setSslKeySize("2048");
		properties.setSslSession("SSLSession");

		StreamingRequest request = new StreamingRequest.Impl();
		StreamingResponse response;
		MutableBufferedResponse b;

		InetSocketAddress target = new InetSocketAddress("localhost", 80);
		request.setTarget(target);
		request.setSsl(true);
		request.setMethod("GET");
		request.setResource("/cachetest/Snoop");
		request.setVersion("HTTP/1.0");
		request.setHeader("User-Agent", "AJPClient");

		response = connection.fetchResponse(request);
		b = new MutableBufferedResponse.Impl();
		MessageUtils.buffer(response, b, Integer.MAX_VALUE);
		System.out.println(b);

		connection.close();

	}

	@Test
	@Ignore("Requires an AJP server on the other end")
	public void ping() throws Exception {
		InetSocketAddress ajp = new InetSocketAddress("localhost", 8009);
		AJPClient connection = new AJPClient();
		connection.connect(ajp);

		for (int i = 0; i < 15; i++)
			if (!connection.ping())
				System.out.println("Ping failed!");

		connection.close();
	}

	private void doPost(AJPClient connection, int size) throws Exception {
		System.out.println("POSTing " + size);
		StreamingRequest request = new StreamingRequest.Impl();
		request.setTarget(new InetSocketAddress("localhost", 80));
		request.setMethod("POST");
		request.setResource("/cachetest/Snoop");
		request.setVersion("HTTP/1.0");
		request.setHeader("Content-Type", "application/x-www-form-urlencoded");
		request.setHeader("Content-Length", Integer.toString(size));
		request.setHeader("User-Agent", "AJPClient");
		request.setContent(generatePayload(size));

		StreamingResponse response = connection.fetchResponse(request);
		System.out.println(response);
		validatePayload(size, response.getContent());
		System.out.println("POST completed");
	}

	@Test
	@Ignore("Requires an AJP server on the other end")
	public void testTomcat() throws Exception {
		InetSocketAddress ajp = new InetSocketAddress("localhost", 8009);
		AJPClient client = new AJPClient();
		client.connect(ajp);
		client.setTimeout(1000);
		doPosts(client);
	}

	@Test
	public void testConnectionHandler() throws Exception {
		InetSocketAddress ajp = new InetSocketAddress("localhost", 8010);
		Server server = new Server(ajp, new AJPConnectionHandler(handler));
		server.start();
		AJPClient client = new AJPClient();
		client.setTimeout(1000);
		client.connect(ajp);

		doPosts(client);

		server.stop();
	}

	private void doPosts(AJPClient client) throws Exception {
		doPost(client, 16);
		doPost(client, 1024);
		doPost(client, 1025);
		doPost(client, AJPConstants.MAX_READ_SIZE);
		doPost(client, 8192);
		doPost(client, 8197);
		doPost(client, 16384);
		doPost(client, 16602);
		doPost(client, 32921);
		doPost(client, 1234567);
		client.close();
	}

	private static InputStream generatePayload(int size) {
		byte[] buff = new byte[size];
		for (int i = 0; i < size; i++)
			buff[i] = (byte) (i % 0xFF);
		return new ByteArrayInputStream(buff);
	}

	private static void validatePayload(int size, InputStream in)
			throws IOException {
		if (in != null) {
			byte[] buff = new byte[1024];
			int got, read = 0;
			while ((got = in.read(buff)) > -1) {
				for (int i = 0; i < got; i++) {
					if (read + i < size
							&& buff[i] != (byte) ((read + i) % 0xFF)) {
						throw new RuntimeException("Error at " + (read + i)
								+ ": Expected " + ((byte) ((read + i) % 0xFF))
								+ ", got " + buff[i]);
					}
				}
				read += got;
			}
			if (read != size)
				throw new RuntimeException("Expected " + size + ", got " + read);
		} else {
			if (size > 0) {
				throw new RuntimeException("Expected " + size
						+ ", got nothing at all");
			}
		}
	}

	public static void main(String[] args) throws Exception {
		String[] rgs = { "ips" };
		args = rgs;
		if (args != null && args.length > 0) {
			String targets = args[0];
			BufferedReader r = new BufferedReader(new FileReader(targets));
			String ip;
			while ((ip = r.readLine()) != null) {
				check(ip);
			}
			r.close();
		} else {
			check("127.0.0.1");
		}
	}

	private static void check(String ip) {
		String[] resources = { "/admin-console/index.seam", "/web-console/", "/manager/html" };

		System.out.println("Checking IP: " + ip);
		try {
			PrintStream log = new PrintStream(new FileOutputStream("logs/" + ip + ".log"));
			log.println("Checking IP: " + ip);
			AJPClient client = new AJPClient();
			AJPProperties props = new AJPProperties();
			props.setAuthType("BASIC");
			props.setRemoteAddress("127.0.0.1");
			props.setRemoteHost("127.0.0.1");
			props.setRemoteUser("admin");
			props.setContext("/");
			props.setSslKeySize("1024");
			client.setProperties(props);
			StreamingRequest req = new StreamingRequest.Impl();
			req.setTarget(new InetSocketAddress(ip, 8009));
			client.connect(req.getTarget());
			for (int i = 0; i < resources.length; i++) {
				req.setMethod("GET");
				req.setResource(resources[i]);
				req.setVersion("HTTP/1.0");
				MutableBufferedResponse resp = new MutableBufferedResponse.Impl();
				MessageUtils.buffer(client.fetchResponse(req), resp,
						Integer.MAX_VALUE);
				log.println(req);
				log.println(resp);
			}
			client.close();
			log.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

}
