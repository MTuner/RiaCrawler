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

package org.owasp.proxy.io;

import org.owasp.proxy.http.MutableResponseHeader;

import java.io.IOException;
import java.io.InputStream;

public class TimingInputStream extends EofNotifyingInputStream {

	private MutableResponseHeader response;

	public TimingInputStream(InputStream in, MutableResponseHeader response)
			throws IOException {
		super(in);
		this.response = response;
	}

	protected void eof() {
		response.setContentTime(System.currentTimeMillis());
	}

}
