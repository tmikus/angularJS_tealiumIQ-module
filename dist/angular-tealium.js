(function (angular, document)
{
    "use strict";

    var tealiumName = "tealium";
    var tealiumUdoName = tealiumName + "Udo";
    var $windowName = "$window";

    angular.module(tealiumName, [])
        .factory(tealiumUdoName, function ()
        {
            var genericView = {};
            var views = [];

            return {
                /**
                 * Gets the view based on the configuration.
                 *
                 * @param config Configuration passed from tealium service.
                 * @returns {*} View data.
                 */
                getView: function (config)
                {
                    var viewsLength = views.length;
                    for (var viewIndex = 0; viewIndex < viewsLength; viewIndex++)
                    {
                        var view = views[viewIndex];

                        if (view.pathRegex && view.pathRegex.test(config.view_id))
                        {
                            return view.data;
                        }
                        else if (view.path == config.view_id)
                        {
                            return view.data;
                        }
                    }

                    return genericView;
                },
                /**
                 * Registers multiple views in the Tealium UDO service.
                 *
                 * @param {{ [path]: string, [pathRegex]: RegExp, data: * }} viewsToRegister Views to register.
                 */
                registerMultiViews: function (viewsToRegister)
                {
                    var viewsToRegisterLength = viewsToRegister.length;
                    for (var viewIndex = 0; viewIndex < viewsToRegisterLength; viewIndex++)
                    {
                        views.push(viewsToRegister[viewIndex]);
                    }
                },
                /**
                 * Registers new view in the Tealium udo service.
                 *
                 * @param {string|RegExp} viewName Name of the view to register.
                 * @param data View data.
                 */
                registerView: function (viewName, data)
                {
                    var view = {
                        data: data
                    };

                    if (viewName instanceof RegExp)
                    {
                        view.pathRegex = viewName;
                    }
                    else
                    {
                        view.path = viewName;
                    }

                    views.push(view)
                },
                /**
                 * Sets the view data for generic view.
                 *
                 * @param view View data to set.
                 */
                setGenericView: function (view)
                {
                    genericView = view;
                }
            };
        })
        .provider(tealiumName, function ()
        {
            /**
             * Configuration set by the class.
             * This is the place where default configuration lies.
             * @type {{account: string, environment: string, get_link_data: function, profile: string, suppress_first_view: boolean, ui_selectors: string, view_id: *}}
             */
            var configuration =
            {
                account: "",
                environment: "dev",
                get_link_data: null,
                inject_tealium: true,
                profile: "",
                suppress_first_view: true,
                ui_selectors: '.trackable, input',
                view_id: "/"
            };

            /**
             * Populates object with data.
             *
             * @param objectToPopulate Object to populate.
             * @param data Data.
             */
            function populateObjectWithData(objectToPopulate, data)
            {
                for (var key in data)
                {
                    if (data.hasOwnProperty(key))
                    {
                        objectToPopulate[key] = data[key];
                    }
                }

                return objectToPopulate;
            }

            /**
             * Changes the configuration of the Tealium.
             *
             * @param options Options to set.
             */
            this.configure = function (options)
            {
                populateObjectWithData(configuration, options);
            };

            /**
             * Gets the Tealium service used for logging events.
             */
            this.$get = ['$location', $windowName, tealiumUdoName, function ($location, $window, tealiumUdo)
            {
                /**
                 * Gets the configuration.
                 * @returns {*}
                 */
                function getConfiguration()
                {
                    var configuration = populateObjectWithData({}, configuration);

                    configuration.view_id = $location.path();

                    return configuration;
                }

                /**
                 * Links data from the clicked element to the utag.
                 *
                 * @param udo
                 * @param e
                 */
                function link(udo, e)
                {
                    var data = populateObjectWithData({}, udo);

                    if (configuration.get_link_data)
                    {
                        populateObjectWithData(data, configuration.get_link_data(e, data));
                    }

                    var customData = (e.target.attributes["data-" + tealiumName] || {}).value;
                    if (customData)
                    {
                        populateObjectWithData(data, JSON.parse(customData));
                    }

                    $window.utag.link(data);
                }

                var lastLinkCallback = null;

                /**
                 * Informs the application that the view was loaded.
                 * Binds click events to the elements on the screen.
                 *
                 * @param {*} [udoOverrides] Overrides to pass to the udo object.
                 */
                function view(udoOverrides)
                {
                    if (!$window.utag)
                        return;

                    var udo = tealiumUdo.getView(getConfiguration());
                    var extendedUdo = populateObjectWithData(udo, udoOverrides);

                    $window.utag.view(extendedUdo);

                    function callback(e)
                    {
                        link(extendedUdo, e);
                    }

                    var elements = document.querySelectorAll(configuration.ui_selectors);
                    for (var elementIndex = 0; elementIndex < elements.length; elementIndex++)
                    {
                        var element = elements[elementIndex];
                        if (lastLinkCallback)
                        {
                            element.removeEventListener("click", lastLinkCallback);
                        }

                        element.addEventListener("click", callback);
                    }

                    lastLinkCallback = callback;
                }

                return {
                    getConfiguration: getConfiguration,
                    view: view
                };
            }];
        })
        .run([$windowName, tealiumName, function ($window, tealium)
        {
            var config = tealium.getConfiguration();

            // Should the first view be suppressed?
            if (config.suppress_first_view)
                $window.utag_cfg_ovrd = { noview : true };

            // Should the Tealium be injected?
            if (!config.inject_tealium)
                return;

            // Injecting tealium script
            (function (a, b, c, d)
            {
                a='//tags.tiqcdn.com/utag/' + config.account + '/' + config.profile + '/' + config.environment + '/utag.js';
                b=document;c='script';d=b.createElement(c);d.src=a;d.type='text/java'+c;d.async=true;
                a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a);
            })();
        }]);
})(angular, document);
