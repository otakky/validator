/**
 * validator.js v0.0.1
 * (c) 2014 otakky
 * License: MIT
 */
(function (global, doc, $) {
    var validatorProto,
        builderProto,
        validMethods = {},
        emailMatcher = /^[_a-zA-Z0-9\-]+(\.[_a-zA-Z0-9\-]+)*@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)*(\.[a-zA-Z]{2,4})$/
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
            throw new Error("please use 'data-valid-params' in an attribute of target element.");
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
     * @returns {Array} inputted Elements
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
     * @param Object params
     * @config String root
     * @config Object customMethods
     * @config Number time
     */
    function Validator(params) {
        var customMethods = params.customMethods || {},
            root = params.root;

        this.root = $(root);
        this.time = params.time || 300;

        if (!this.root.length) {
            throw new Error("selector: " + root + " is not found.");
        }

        $.extend(validMethods, customMethods);

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
        var inputsElem;

        this.validator = validator;

        this.captureDOM();
        this.bindMethods();
        this.emitInitialize();
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

        this.validator.getErrorFields = $.proxy(this, "getErrorFields");
        this.validator.getEmptyFields = $.proxy(this, "getEmptyFields");
        this.validator.getPassFields = $.proxy(this, "getPassFields");
    };

    builderProto.getErrorNum = function () {
        return this.allInputFields.filter(".valid-error").length;
    };

    builderProto.getEmptyNum = function () {
        return this.allInputFields.filter(".valid-empty").length;
    };

    builderProto.getPassNum = function () {
        return this.allInputFields.filter(".valid-pass").length;
    };

    builderProto.captureDOM = function () {
        var allInputFields = this.validator.root.find(":input").not(":submit"),
            groupTargets = allInputFields.filter("[data-valid-group]");

        this.validator.allInputFields = this.allInputFields = allInputFields;

        this.groupTargets = groupTargets;
        this.singleTargets = allInputFields.not(groupTargets);
    };

    /**
     * observe elements for validation.
     */
    builderProto.observeAllTargets = function () {
        var time = this.validator.time;
        if (this.intervalId) {
            this.stopToObserve();
        }

        this.intervalId = setInterval($.proxy(this, "checkAllTargets"), time);
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

        this.validateSingles(this.singleTargets);
        this.validateGroup(this.getGroups());

        this.emitOverallStatus();
    };

    builderProto.getGroups = function () {
        var groups = {};

        this.groupTargets.each(function (index, target) {
            var name;

            target = $(target);
            name = target.data("validGroup");

            groups[name] = groups[name] || [];
            groups[name].push(target);
        });

        return groups;
    };

    /**
     * validate target.
     *
     * @param {jQueryElement} target
     */
    builderProto.validateSingles = function (targets) {
        var that = this;

        targets.each(function (index, target) {
            var val, type, status;

            target = $(target);
            type = target.data("validType");

            status = that.getStatus(target, type);

            that.setStatus(target, status);
            that.emitStatus(target, status, type || "isInput");
        });
    };

    /**
     * validate target and elements in same group.
     *
     * @param {Object} groups
     */
    builderProto.validateGroup = function (groups) {
        var that = this;
        $.each(groups, function (name) {
            var group, inputItems, emptyItems;

            group = that.groupTargets.filter("[data-valid-group=" + name + "]");

            inputItems = validMethods.anyone(group);

            if (!inputItems.length) {
                that.removeStatus(group);
                that.setStatus(group.eq(0), "empty");
                that.emitStatus(group, "empty", "groupempty");
                return;
            }

            // validate only input items
            emptyItems = group;
            $.each(inputItems, function (index, item) {
                emptyItems = emptyItems.not(item);

                that.validateSingles(item);
            });

            if (emptyItems.length) {
                that.removeStatus(emptyItems);
                that.setStatus(emptyItems.eq(0), "pass");
                that.emitStatus(emptyItems, "pass", "grouppass");
            }
        });
    };

    /**
     * emit to finish initialize.
     */
    builderProto.emitInitialize = function () {
        this.validator.emit("init", this.allInputFields);
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
        var allInputFields = this.allInputFields,
            emptyNum = this.getEmptyNum(),
            errorNum  = this.getErrorNum();

        if (emptyNum === allInputFields.not(".valid-ignore").length) {
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
        this.removeStatus(target);

        target.addClass("valid-" + status);
    };

    builderProto.removeStatus = function (target) {
        target.removeClass("valid-pass");
        target.removeClass("valid-error");
        target.removeClass("valid-empty");
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
