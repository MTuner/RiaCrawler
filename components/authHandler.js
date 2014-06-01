// Authorization handler.

function AuthHandler() {
    this.initialForm = Settings.get("AuthHandler.authForm");
    this.cookies = Settings.get("AuthHandler.cookies");
    Logger.registerSpace(this);
}
Decisions.register(AuthHandler, "AuthHandler");


AuthHandler.prototype.formAuthRequired = function() {
    return (typeof this.initialForm !== "undefined");
}


AuthHandler.prototype.initialAuthorization = function (casper, formHandler) {
    if (typeof this.initialForm === "undefined" && typeof this.cookies === "undefined")
        return;

    if (typeof casper === "undefined") {
        Logger.warning(this, "Casper is not passed to the method initialAuthorization");
        return;
    }
    if (typeof phantom === "undefined") {
        Logger.warning(this, "Phantom is not defined")
        return;
    }
    if (typeof formHandler === "undefined") {
        Logger.warning(this, "FormHandler is not passed to the method initialAuthorization");
        return;
    }
    if (typeof this.initialForm !== "undefined" && (typeof this.initialForm.url === "undefined" || this.initialForm.url.match(casper.getCurrentUrl()) === null)) {
        Logger.warning(this, "Authorization url parameters are not correct");
        return;
    }

    if (typeof this.cookies !== "undefined") {
        for (var i = 0; i < this.cookies.length; ++i) {
            var cookie = this.cookies[i]
            if (cookie.name && cookie.value && cookie.domain)
                phantom.addCookie({
                  'name': cookie.name,
                  'value': cookie.value,
                  'domain': cookie.domain
                });
        }
    }

    if (typeof this.initialForm !== "undefined") {
        formHandler.fillForm(casper, this.initialForm);

        var toSubmit = this.initialForm.toSubmit;

        casper.evaluate(function (selector, eventType) {
            var element = document.querySelector(selector);

            if (element.tagName.toLowerCase() == "form" && eventType == "submit") {
                element.submit();
                return;
            }

            if (element.fireEvent) {
                (element.fireEvent('on' + eventType));
            } else {
                var eventObject = document.createEvent('Events');
                eventObject.initEvent(eventType, true, false);
                element.dispatchEvent(eventObject);
            }

        }, toSubmit.selector, toSubmit.event);
    }
};
