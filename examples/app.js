(function (global, doc, $) {
    var validator = new Validator({root: "#sample", time: 500}),
        isAllEmpty = true;
    ;

    validator.build();

    validator.on("init", function (target) {
        target.not(".valid-ignore").addClass("attention");

        $(".submitBtn").attr("disabled", "disabled");

        $(global).bind("beforeunload", function (evt) {
            var msg;

            if (isAllEmpty) {
                return;
            }

            msg = "you do not input " + validator.invalidNum + " form(s).";

            return msg;
        });
    });

    validator.on("pass", function (target) {
        if (target.is("input:checkbox")) {
            target = target.closest(".wrap");
        }

        target.removeClass("attention");
    });

    validator.on("error", function (target, type) {
        if (target.is("input:checkbox")) {
            target = target.closest(".wrap");
        }

        target.removeClass("pass");
        target.addClass("attention");

        $(".submitBtn").attr("disabled", "disabled");
    });

    validator.on("empty", function (target, type) {
        if (target.is("input:checkbox")) {
            target = target.closest(".wrap");
        }

        target.removeClass("pass");
        target.addClass("attention");

        $(".submitBtn").attr("disabled", "disabled");
    });

    validator.on("allpass", function () {
        $(".submitBtn").removeAttr("disabled");
    });

    validator.on("inputanyone", function () {
        isAllEmpty = false;
    });

    validator.on("allempty", function () {
        isAllEmpty = true;
    });

    validator.start();
}(window, document, jQuery));
