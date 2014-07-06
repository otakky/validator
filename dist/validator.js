/**
 * validator.js v0.0.1
 * (c) 2014 otakky
 * License: MIT
 */
;(function (global, doc, $) {
    var validatorProto,
        builderProto,
        validMethods = {},
        emailMatcher = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/,
        telMatcher = /^[0-9]{2,4}-[0-9]{2,4}-[0-9]{2,4}$/;
    ;

    /**
     * validMethods
     */
    validMethods.isInput = function (elem) {
        var value = elem.val();

        if (elem.is("input:checkbox")){
            return !!elem.is(":checked");
        }

        return !!value;
    };

    validMethods.isNumber = function (elem) {
        var value = elem.val();

        if (value === "") {
            return false;
        }
        return !isNaN(+value);
    };

    validMethods.isTel = function (elem) {
        var value = elem.val();

        return !!telMatcher.test(value);
    };

    validMethods.isEmail = function (elem) {
        var value = elem.val();

        return !!emailMatcher.test(value);
    };

    validMethods.anyone = function (group) {
        var inputItem = [];

        group.each(function (index, elem) {
            elem = $(elem);

            if (validMethods.isInput(elem)) {
                inputItem.push(elem);
            }
        });

        return inputItem;
    };

    /**
     * Validator
     *
     * @class
     */
    function Validator(root) {
        this.root = $(root);

        if (!this.root.length) {
            throw new Error("selector: " + root + " is not found.");
        }

        addEmitter(this);
    };

    validatorProto = Validator.prototype;

    validatorProto.build = function () {
        new Builder(this);
    };

    /**
     * Builder
     *
     * @class
     */
    function Builder(validator) {
        var inputsElem, root = validator.root;

        this.validator = validator;

        this.allTargets = root.find(":input").not(":submit");
        this.groupTargets = this.allTargets.filter("[data-valid-group]");

        this.checkAllTargets();
        this.observeAllTargets();
        this.emitInitialize();
        this.bindAllListeners();
    }

    // alias to Builder.prototype
    builderProto = Builder.prototype;


    /**
     * bint events to listeners
     */
    builderProto.bindAllListeners = function () {
        this.validator.on("allcheck", $.proxy(this, "checkAllTargets"));
    };

    builderProto.observeAllTargets = function () {
        setInterval($.proxy(this, "checkAllTargets"), 300);
    };

    builderProto.checkAllTargets = function () {
        var that = this;


        this.allTargets.each(function (index, elem) {
            elem = $(elem);
            that.validate(elem);
        });


        this.emitCurrentStatus();
    };

    builderProto.validate = function (target) {
        var groupName = target.data("validGroup");

        if (groupName) {
            this.validateGroup(target, groupName);
            return;
        }

        this.validateOne(target);
    };

    builderProto.validateOne = function (target) {
        var val,
            type = target.data("validType"),
            isIgnore = target.hasClass("valid-ignore"),
            status;


        if (!validMethods.isInput(target)) {
            status = isIgnore ? "pass" : "empty";
        }

        if (!status && type) {
            status = validMethods[type](target) ? "pass" : "error";
        }

        this.setStatus(target, status);
        this.emitStatus(target, status, type || "isInput");
    };

    builderProto.validateGroup = function (target, groupName) {
        var groups = this.groupTargets.filter("[data-valid-group=" + groupName + "]"),
            inputItems = validMethods.anyone(groups),
            status = inputItems.length ? "pass" : "empty",
            that = this;

        this.setStatus(groups, status);
        this.emitStatus(groups, status, "groupempty");

        // validate only input items
        $.each(inputItems, function (index, elem) {
            that.validateOne(elem);
        });
    };

    builderProto.emitInitialize = function () {
        this.validator.emit("init", this.allTargets);
    };

    builderProto.emitStatus = function (target, status, validType) {
        this.validator.emit(status, target, validType);
    };

    builderProto.emitCurrentStatus = function () {
        var allTargets = this.allTargets,
            emptyNum = allTargets.filter(".valid-empty").length,
            errorNum  = allTargets.filter(".valid-error").length;

        this.validator.invalidNum = emptyNum + errorNum;

        if (emptyNum === allTargets.not(".valid-ignore").length) {
            this.validator.emit("allempty");
        } else {
            this.validator.emit("inputanyone");
        }

        if (errorNum || emptyNum) {
            return;
        }

        this.validator.emit("allpass");
    };

    builderProto.setStatus = function (target, status) {
        target.removeClass("valid-pass");
        target.removeClass("valid-error");
        target.removeClass("valid-empty");

        target.addClass("valid-" + status);
    };

    /**
     * addEmitter
     */
    function addEmitter (obj) {
        var listeners = {};

        obj.emit = function (name) {
            var functions = listeners[name],
                args = Array.prototype.slice.call(arguments, 1);

            if (!$.isArray(functions)) {
                return;
            }

            $.each(functions, function (index, callback) {
                callback.apply(obj, args);
            });
        };

        obj.on = function (name, callback) {
            var functions = listeners[name] || [];

            functions.push(callback);
            listeners[name] = functions;
        };

        obj.off = function (name) {
            delete listeners[name];
        };
    }

// set to global
global["Validator"] = Validator;
}(window, document, jQuery));
