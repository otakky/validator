/**
 * validator.js v0.0.1
 * (c) 2014 otakky
 * License: MIT
 */
(function (global, doc, $) {
    var validatorProto,
        builderProto,
        validMethods = {},
        emailMatcher = /^[_a-zA-Z0-9-]+(\.[_a-zA-Z0-9-]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\.[a-zA-Z]{2,4})$/
    ;

    /**
     * check value of elem is input.
     *
     * @param {jQueryElement} elem target of validation
     * @returns {Boolean} valid / invalid
     */
    validMethods.isInput = function (elem) {
        var value = elem.val();

        if (elem.is("input:checkbox")){
            return !!elem.is(":checked");
        }

        return !!value;
    };

    /**
     * check value of elem is Number.
     *
     * @param {jQueryElement} elem target of validation
     * @returns {Boolean} valid / invalid
     */
    validMethods.isNumber = function (elem) {
        var value = elem.val();

        if (value === "") {
            return false;
        }
        return !isNaN(+value);
    };

    /**
     * check value of elem matching to pattern.
     *
     * @param {jQueryElement} elem target of validation
     * @param {String} pattern regexp pattern
     * @returns {Boolean} elem is valid / invalid
     */
    validMethods.isRegExp = function (elem, pattern) {
        var value = elem.val();

        if (!pattern) {
            throw new Error("please use 'data-valid-paams' in an attribute of target element.");
        }

        return (new RegExp(pattern)).test(value);

    };

    /**
     * check value of elem matching to e-mail format.
     *
     * @param {jQueryElement} elem target of validation
     * @returns {Boolean} valid / invalid
     */
    validMethods.isEmail = function (elem) {
        var value = elem.val();

        return !!emailMatcher.test(value);
    };

    /**
     * check to input at least one in elements of group.
     *
     * @param {jQueryElement} group targets of validation
     * @returns {Boolean} valid / invalid
     */
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
        this.validator.invalidNum = 0;

        this.allTargets = root.find(":input").not(":submit");
        this.groupTargets = this.allTargets.filter("[data-valid-group]");

        this.checkAllTargets();
        this.observeAllTargets();
        this.emitInitialize();

        this.bindMethods();
    }

    // alias to Builder.prototype
    builderProto = Builder.prototype;

    /**
     * bind methods to validator object.
     */
    builderProto.bindMethods = function () {
        this.validator.allcheck = $.proxy(this, "checkAllTargets");
        this.validator.start = $.proxy(this, "observeAllTargets");
        this.validator.stop = $.proxy(this, "stopToObserve");
    };

    /**
     * observe elements per 300ms for validation.
     */
    builderProto.observeAllTargets = function () {
        this.intervalId = setInterval($.proxy(this, "checkAllTargets"), 300);
    };

    /**
     * stop to observe.
     */
    builderProto.stopToObserve = function () {
        clearInterval(this.intervalId);
    };

    /**
     * validate all validation targets, and emit these status.
     */
    builderProto.checkAllTargets = function () {
        var that = this;


        this.allTargets.each(function (index, elem) {
            elem = $(elem);
            that.validate(elem);
        });


        this.emitOverallStatus();
    };

    /**
     * validate target(s).
     *
     * @param {jQueryElement} target
     */
    builderProto.validate = function (target) {
        var groupName = target.data("validGroup");

        if (groupName) {
            this.validateGroup(target, groupName);
            return;
        }

        this.validateOne(target);
    };

    /**
     * validate target.
     *
     * @param {jQueryElement} target
     */
    builderProto.validateOne = function (target) {
        var val,
            type = target.data("validType"),
            status;

        status = this.getStatus(target, type);

        this.setStatus(target, status);
        this.emitStatus(target, status, type || "isInput");
    };

    /**
     * validate target and elements in same group.
     *
     * @param {jQueryElement} target
     * @param {String} groupName
     */
    builderProto.validateGroup = function (target, groupName) {
        var groups = this.groupTargets.filter("[data-valid-group=" + groupName + "]"),
            inputItems = validMethods.anyone(groups),
            status = inputItems.length ? "pass" : "empty",
            that = this;

        this.setStatus(groups, status);
        this.emitStatus(groups, status, "groupempty");

        // validate only input items
        $.each(inputItems, function (index, item) {
            that.validateOne(item);
        });
    };

    /**
     * emit to finish initialize.
     */
    builderProto.emitInitialize = function () {
        this.validator.emit("init", this.allTargets);
    };

    /**
     * emit to status of target.
     *
     * @param {jQueryElement} target
     * @param {String} status
     * @param {String} validType
     */
    builderProto.emitStatus = function (target, status, validType) {
        this.validator.emit(status, target, validType);
    };

    /**
     * emit to overall status.
     */
    builderProto.emitOverallStatus = function () {
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

    /**
     * change CSS class of target to matched status.
     *
     * @param {jQueryElement} target
     * @param {String} status
     */
    builderProto.setStatus = function (target, status) {
        target.removeClass("valid-pass");
        target.removeClass("valid-error");
        target.removeClass("valid-empty");

        target.addClass("valid-" + status);
    };

    /**
     * get status of target.
     *
     * @param {jQueryElement} target
     * @param {String} type method name of validMethods
     * @returns {String} status of target
     */
    builderProto.getStatus = function (target, type) {
        var isIgnore = target.hasClass("valid-ignore"),
            params = target.data("validParams");

        if (!validMethods.isInput(target)) {
            return isIgnore ? "pass" : "empty";
        }

        if (!type) {
            return "pass";
        }

        return validMethods[type](target, params) ? "pass" : "error";
    };

    /**
     * add emit/on/off methods to obj
     *
     * @param {Object} obj
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

    // set
    if (typeof require !== 'undefined' && typeof require.amd === 'object') {
        define({Validator: Validator});
    } else {
        global.Validator = Validator;
    }
}(window, document, jQuery));
