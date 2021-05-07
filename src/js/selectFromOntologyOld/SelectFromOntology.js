jQuery.PinaxRegisterType("selectfromontology", {
    __construct: function () {
        var self = this;
        $(this).removeAttr('value');
        $(this).css('width', '500px');

        var fieldName = $(this).data('field') || $(this).attr('name');
        var multiple = $(this).data('multiple');
        var addNewValues = $(this).data('add_new_values');
        var model = $(this).data('model');
        var query = $(this).data('query');
        var proxy = $(this).data('proxy');
        var proxySecondLevel = $(this).data('proxysecondlevel');
        var proxyParams = $(this).data('proxy_params');
        if (typeof (proxyParams) == 'string') {
            proxyParams = proxyParams.replace(/##/g, '"');
        } else {
            proxyParams = JSON.stringify(proxyParams);
        }
        var placeholder = $(this).data('placeholder');
        var originalName = $(this).data('originalName');
        var getId = $(this).data('get_id');
        var minimumInputLength = $(this).data('min_input_length') || 0;
        var formatSelection = $(this).data('format_selection');
        var formatResult = $(this).data('format_result');
        var ajaxUrl = $(this).data('pinaxOpt').AJAXAction;

        if (originalName !== undefined && $(this).data('override') !== false) {
            fieldName = originalName;
        }

        var el = $(this);

        $(this).select2({
            width: 'off',
            height: 250,
            multiple: multiple,
            minimumInputLength: minimumInputLength,
            placeholder: placeholder === undefined ? '' : placeholder,
            closeOnSelect: false,
            allowClear: true,
            initSelection: function (element, callback) {

            },
            ajax: {
                url: ajaxUrl + "&controllerName=pinaxcms.contents.controllers.autocomplete.ajax.FindTerm",
                dataType: 'json',
                quietMillis: 250,
                data: function (term, page) {
                    return {
                        fieldName: fieldName,
                        model: model,
                        query: query,
                        term: term,
                        proxy: proxy,
                        proxyParams: proxyParams,
                        getId: getId
                    };
                },
                results: function (data, page) {
                    return {
                        results: data.result
                    }
                }
            },
            createSearchChoice: function (term, data) {
                if (!addNewValues) {
                    return false;
                }

                if ($(data).filter(function () {
                        return this.text.localeCompare(term) === 0;
                    }).length === 0) {
                    return {
                        id: term,
                        text: term
                    };
                }
            },
            formatResult: function (data) {
                return formatResult === undefined ? data.text : window[formatResult](data);
            },
            formatSelection: function (data) {
                return formatSelection === undefined ? data.text : window[formatSelection](data);
            }
        }).on('change', function (e) {
            self._getValue();
        }).on('close', function (e) {
            $('body').find('.select2-results-second-level').html('');
        }).on('click', function (e) {
            $('.select2-disabled').removeClass('select2-disabled').addClass('select2-highlighted').prev().removeClass('select2-highlighted');
        });

        //Customize container
        var resultDiv = el.parent().find('ul.select2-results');
        resultDiv.parent().height(320);
        resultDiv.attr('style', 'width:30%;height:320px;max-height:316px !important;float:left;border-right:1px solid #000;font-size:14px;');
        resultDiv.after('<div>' +
            '<input id="refine-search" name="refine-search" placeholder="Raffina ricerca" style="width:68%;margin-left:10px;"/>' +
            '<span id="refine-search-label"><span>' +
            '</div>' +
            '<ul class="select2-results-second-level select2-results" style="width:69%;float:right;max-height:280px;font-size:14px;">' +
            '</ul>');
        // ----- //


        $(this).parent().find('.select2-results').not('.select2-results-second-level').on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            el.parent().find('.select2-search-choice:last').remove();
            data = el.select2('val');
            var ontologyId = data[data.length - 1];
            $('#refine-search').attr('data-ontologyId', ontologyId);
            data.pop();
            el.select2('val', data);

            $.ajax({
                url: ajaxUrl + "&controllerName=pinaxcms.contents.controllers.autocomplete.ajax.FindTerm",
                dataType: 'json',
                quietMillis: 250,
                data: {
                    fieldName: fieldName,
                    model: model,
                    query: query,
                    term: ontologyId,
                    proxy: proxySecondLevel,
                    proxyParams: proxyParams,
                    getId: getId
                },
                complete: function (data) {
                    result = data.responseJSON.result;
                    var html = '';
                    for (i = 0; i < result.length; i++) {
                        html += '<li class="select2-result">' +
                            '<div class="select2-result-label js-set-tag" onclick="document.setTag(\'' + result[i].id + '\',\'' + result[i].text + '\',\'' + result[i].type + '\')" data-id="' + result[i].id + '">' + result[i].text + '</div>' +
                            '</li>';
                    }
                    $('.select2-results-second-level').html(html);
                }
            });
        });

        var currentRequest = null;
        el.parent().find('#refine-search').on('input', function () {
            var val = $(this).val();
            var ontologyId = $(this).attr('data-ontologyId');
            if (!ontologyId) {
                return;
            }

            currentRequest = $.ajax({
                url: ajaxUrl + "&controllerName=pinaxcms.contents.controllers.autocomplete.ajax.FindTerm",
                dataType: 'json',
                quietMillis: 250,
                data: {
                    fieldName: fieldName,
                    model: model,
                    query: query,
                    term: ontologyId,
                    proxy: proxySecondLevel,
                    proxyParams: '{"text":"' + val + '"}',
                    getId: getId
                },
                beforeSend: function () {
                    if (currentRequest != null) {
                        currentRequest.abort();
                    }
                },
                complete: function (data) {
                    if (data.responseJSON) {
                        result = data.responseJSON.result;
                        var html = '';
                        for (i = 0; i < result.length; i++) {
                            html += '<li class="select2-result">' +
                                '<div class="select2-result-label js-set-tag" onclick="document.setTag(\'' + result[i].id + '\',\'' + result[i].text + '\',\'' + result[i].type + '\')" data-id="' + result[i].id + '">' + result[i].text + '</div>' +
                                '</li>';
                        }
                        resultDiv.parent().find('.select2-results-second-level').html(html);
                    }
                }
            });
        });

        document.setTag = function (id, text, type) {
            var value = {
                'id': id,
                'text': text,
                'type': type
            };
            data = el.select2('data');
            data.push(value);
            el.select2('data', data);
        }

        if (multiple) {
            var el = $(this);
            el.parent().find("ul.select2-choices").sortable({
                containment: 'parent',
                start: function () {
                    el.select2("onSortStart");
                },
                update: function () {
                    el.select2("onSortEnd");
                }
            });
        }

        $('body').on('mouseover', '.select2-results-second-level .select2-result .select2-result-label', function () {
            $(this).addClass('select2-highlighted');
        });

        $('body').on('mouseleave', '.select2-results-second-level .select2-result .select2-result-label', function () {
            $(this).removeClass('select2-highlighted');
        });


        this._setValue = function (value) {
            var baseValue = value || $(this).data('origValue');
            var multiple = $(this).data('multiple');

            try {
                if (Object.prototype.toString.call(baseValue) === '[object Array]') {
                    value = baseValue
                } else {
                    value = JSON.parse(baseValue);
                }
            } catch (e) {
                value = baseValue;
            }
            if (multiple === undefined || multiple === false) {
                if (value) {
                    if (typeof (value) == "object") {
                        $(this).select2('data', value);
                    } else {
                        $(this).select2('data', {
                            id: value,
                            text: value
                        });
                    }
                }
            } else if (Array.isArray(value)) {
                var arrayVal = [];

                $.each(value, function (index, v) {
                    if (typeof (v) == "object") {
                        arrayVal.push(v);
                    } else {
                        arrayVal.push({
                            id: v,
                            text: v
                        });
                    }
                });

                $(this).select2('data', arrayVal);
            }
        }

        this._getValue = function () {
            var data;
            if ($(this).data('return_object')) {
                data = $(this).select2('data');
            } else {
                data = $(this).select2('val');
            }
            $(this).data('origValue', JSON.stringify(data));
            return data;
        }

        this._setValue();
    },

    getValue: function () {
        return this._getValue();
    },

    setValue: function (value) {
        if (value) {
            this._setValue(value);
        }
    },

    destroy: function () {
        $(this).select2("destroy").off("change");
    },

    focus: function () {
        $(this).select2('focus');
    }
});


function formatSelection(data) {
    return data.text + '<br><small>' + data.type + '</small>';
}

function formatResult(data) {
    return data.text + '<br><small>' + data.type + '</small>';
}
