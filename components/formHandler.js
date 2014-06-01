// Fills forms on the page.

// Properties of form object:
// - url: url
// - elements:[{ selector, property, value }, ..., {}], (list of elements ant their required values)
// - toSubmit: {selector, event};
// (initialAuthorization form may not contain url)

function FormHandler() {
    this.forms = Settings.get("FormHandler.forms");
    Logger.registerSpace("FormHandler");
}
Decisions.register(FormHandler, "FormHandler");


FormHandler.prototype.fillPageForms = function (casper) {
    if (typeof this.forms === "undefined") {
        return;
    }

    if (typeof casper === "undefined") {
        Logger.warning(this, "Casper is not passed to the method initialAuthorization");
        return;
    }

    for (var i = 0; i < this.forms.length; i++) {
        var form = this.forms[i];
        this.fillForm(casper, form)
    }

    if (Settings.get("FormHandler.fillRandom", false)) {
        this._fillRandomForms(casper);
    }
};


FormHandler.prototype.fillForm = function (casper, form) {
    if (typeof form.url !== "undefined" && casper.getCurrentUrl().match(form.url) !== null) {
        Logger.debug(this, "Fill manually configured form");
        var elements = form.elements;
        for (var j = 0; j < elements.length; j++) {
            casper.evaluate(function (selector, property, value) {
                console.log("Fill element: " + selector + " " + property + " " + value);
                var element = document.querySelector(selector);
                element[property] = value;
            }, elements[j].selector, elements[j].property, elements[j].value);
        }
    }
};


FormHandler.prototype._fillRandomForms = function(casper) {
    casper.evaluate(function() {
        function randomString()
        {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for( var i=0; i < 5; i++ )
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        }

        function randomNumber() {
            var text = "";
            var possible = "123456789";
            for( var i=0; i < 5; i++ )
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        }

        function randomEmail() {
            return "example@example.com";
        }

        function randomChecked() {
            return (Math.round((Math.random() * 1)) === 0);
        }

        var textInputs = document.querySelectorAll('input[type="text"]');
        for (var i = 0; i < textInputs.length; ++i) {
            textInputs[i].value = randomString();
        }

        var checkInputs = document.querySelectorAll('input[type="checkbox"]');
        for (var i = 0; i < checkInputs.length; ++i) {
            checkInputs[i].checked = randomChecked();
        }

        var radioInputs = document.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < radioInputs.length; ++i) {
            radioInputs[i].checked = randomChecked();
        }

        var checkNumbers = document.querySelectorAll('input[type="number"]');
        for (var i = 0; i < checkNumbers.length; ++i) {
            checkNumbers[i].value = randomNumber();
        }

        var checkEmails = document.querySelectorAll('input[type="email"]');
        for (var i = 0; i < checkEmails.length; ++i) {
            checkEmails[i].value = randomEmail();
        }
    });
};

