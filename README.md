# validator

validator is a library for validation of HTML input forms.
this is depended on [jQuery](http://jquery.com/).


## usage
```js
var validator = new Validator("#sample");

validator.on("init", function (target) {
  $(".submitBtn").attr("disabled", "disabled");
};

validator.on("allpass", function () {
  $(".submitBtn").removeAttr("disabled");
});
```
