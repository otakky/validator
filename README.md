# validator

validator is a library for validation of HTML input forms.
this is depended on [jQuery](http://jquery.com/).


## simple usage
```js
var validator = new Validator("#form");

validator.on("init", function () {
  $(".submitBtn").attr("disabled", "disabled");
};

validator.on("allpass", function () {
  $(".submitBtn").removeAttr("disabled");
});

validator.run();
```

