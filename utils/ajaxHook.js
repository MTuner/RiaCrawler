// Hook XMLHttpRequest.open(), to send all requests synchronously
// To use, inject this script on page initialization (casper.onPageInitialized)
XMLHttpRequest.prototype.realOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (a, b, async, d, e) {
    console.log("Hooked ajax...");
    return this.realOpen(a, b, /*async = */false, d, e);
};
