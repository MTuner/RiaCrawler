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

package org.owasp.proxy.ssl;

import javax.net.ssl.X509KeyManager;
import java.io.*;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.Map;

public class KeystoreUtils {

	public static X509KeyManager getKeyManagerForAlias(KeyStore keyStore,
			String alias, char[] password) throws GeneralSecurityException {
		Key key = keyStore.getKey(alias, password);
		Certificate[] chain = keyStore.getCertificateChain(alias);
		if (key instanceof PrivateKey) {
			X509Certificate[] certChain = new X509Certificate[chain.length];
			for (int i = 0; i < chain.length; i++) {
				if (chain[i] instanceof X509Certificate) {
					certChain[i] = (X509Certificate) chain[i];
				} else {
					throw new InvalidKeyException("CA cert[" + i
							+ "] is not an X509Certificate: " + chain[i]);
				}
			}
			return new SingleX509KeyManager(alias, (PrivateKey) key, certChain);
		} else {
			throw new InvalidKeyException(
					"The private key should implement PrivateKey, but is a " + key);
		}
	}

	public static X509KeyManager loadFromKeyStore(InputStream in, String type,
			String alias, char[] password) throws GeneralSecurityException,
			IOException {
		KeyStore ks = KeyStore.getInstance(type);
		ks.load(in, password);
		return getKeyManagerForAlias(ks, alias, password);
	}

	public static void addToKeyStore(KeyStore keyStore, X509KeyManager km,
			String alias, char[] password) throws GeneralSecurityException {
		keyStore.setKeyEntry(alias, km.getPrivateKey(alias), password,
				km.getCertificateChain(alias));
	}

	public static void saveToKeyStore(OutputStream out, X509KeyManager km,
			String alias, String type, char[] password)
			throws GeneralSecurityException, IOException {
		KeyStore ks = KeyStore.getInstance(type);
		ks.load(null, password);
		addToKeyStore(ks, km, alias, password);
		ks.store(out, password);
	}

	public static KeyStore getPKCS11Keystore(String name, File library,
			int slot, char[] password) throws ClassNotFoundException,
			NoSuchMethodException, InvocationTargetException,
			IllegalAccessException, InstantiationException,
			GeneralSecurityException, IOException {
		// Set up a virtual config file
		if (!library.exists())
			throw new FileNotFoundException(library + " could not be found");
		StringBuffer cardConfig = new StringBuffer();
		cardConfig.append("name = ").append(name).append("\n");
		cardConfig.append("library = ").append(library.getAbsolutePath()).append("\n");
		cardConfig.append("slotListIndex = ").append(Integer.toString(slot))
				.append("\n");
		InputStream is = new ByteArrayInputStream(cardConfig.toString()
				.getBytes());

		// create the provider
		Class<?> pkcs11Class = Class.forName("sun.security.pkcs11.SunPKCS11");
		Constructor<?> c = pkcs11Class
				.getConstructor(new Class[] { InputStream.class });
		Provider pkcs11 = (Provider) c.newInstance(new Object[] { is });
		Security.addProvider(pkcs11);

		// init the key store
		KeyStore ks = KeyStore.getInstance("PKCS11");
		ks.load(null, password);
		return ks;
	}

	public static Map<String, String> getAliases(KeyStore keyStore) throws KeyStoreException {
		Enumeration<String> aliases = keyStore.aliases();
		Map<String, String> all = new LinkedHashMap<String, String>();
		while (aliases.hasMoreElements()) {
			String alias = aliases.nextElement();
			all.put(alias, splitDN(getName(keyStore, alias))[0]);
		}
		return all;
	}

	public static String getName(KeyStore ks, String alias) throws KeyStoreException {
		Certificate cert = ks.getCertificate(alias);
		if (cert instanceof X509Certificate) {
			X509Certificate xcert = (X509Certificate) cert;
			return xcert.getSubjectX500Principal().getName();
		}
		return "Unknown";
	}

	public static String[] splitDN(String name) {
		return name.split(", *");
	}
}
