(function (angular, document)
{
    "use strict";

    var tealiumName = "tealium";
    var tealiumUdoName = tealiumName + "Udo";
    var $windowName = "$window";

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
                    var viewToReturn = genericView;

                    var viewsLength = views.length;
                    for (var viewIndex = 0; viewIndex < viewsLength; viewIndex++)
                    {
                        var view = views[viewIndex];

                        if ((view.pathRegex && view.pathRegex.test(config.view_id)) || (view.path == config.view_id))
                        {
                            viewToReturn = view.data;
                            break;
                        }
                    }

                    return populateObjectWithData({}, viewToReturn);
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
                    var view =
                    {
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
             * @type {{
             *  account: string,
             *  environment: string,
             *  get_link_data: function,
             *  profile: string,
             *  suppress_first_view: boolean,
             *  ui_selectors: string,
             *  view_id: *
             * }}
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
            this.$get = ['$location', '$timeout', $windowName, tealiumUdoName, function ($location, $timeout, $window, tealiumUdo)
            {
                var defaultLinkData = {};

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
                 * Parses custom data added to the element.
                 * @param target Target of the event.
                 * @param data Data assigned to the element.
                 * @returns {*}
                 */
                function parseCustomData(target, data)
                {
                    try
                    {
                        var $scope = angular.element(target).scope();
                        return $scope ? $scope.$eval(data) : eval("(function(){return " + data + "})()");
                    }
                    catch (ex)
                    {
                        return {};
                    }
                }

                /**
                 * Links data from the clicked element to the utag.
                 *
                 * @param udo
                 * @param e
                 */
                function link(udo, e)
                {
                    var data = populateObjectWithData({}, defaultLinkData);
                   populateObjectWithData(data, udo);

                    if ((e.currentTarget.attributes["data-" + tealiumName + "-custom-event"] || {}).value !== "true")
                    {
                        if (configuration.get_link_data)
                        {
                            populateObjectWithData(data, configuration.get_link_data(e, data));
                        }
                    }

                    var customData = (e.currentTarget.attributes["data-" + tealiumName] || {}).value;
                    if (customData)
                    {
                        populateObjectWithData(data, parseCustomData(e.currentTarget, customData));
                    }

                    $window.utag.link(data);
                }

                var elementIndex;
                var lastClickCallback = null;
                var lastRegisteredEventListeners = null;

                /**
                 * Performs re-indexing of click listeners on the current page.
                 *
                 * @param [udoOverrides] Optional UDO overrides to pass.
                 */
                function indexClickListeners(udoOverrides)
                {
                    var udo = tealiumUdo.getView(getConfiguration());
                    populateObjectWithData(udo, udoOverrides || {});

                    if (lastClickCallback)
                    {
                        for (elementIndex = 0; elementIndex < lastRegisteredEventListeners.length; elementIndex++)
                        {
                            lastRegisteredEventListeners[elementIndex].removeEventListener("click", lastClickCallback);
                        }
                    }

                    lastClickCallback = function (e)
                    {
                        link(udo, e);
                    };

                    lastRegisteredEventListeners = document.querySelectorAll(configuration.ui_selectors);
                    for (elementIndex = 0; elementIndex < lastRegisteredEventListeners.length; elementIndex++)
                    {
                        lastRegisteredEventListeners[elementIndex].addEventListener("click", lastClickCallback);
                    }
                }

                /**
                 * Informs the application that the link was clicked
                 *
                 * @param {*} [udoOverrides] Overrides to pass to the udo object.
                 */
                function customLink(udoOverrides)
                {
                    if (!$window.utag)
                        return;

                    var data = populateObjectWithData({}, defaultLinkData);
                    populateObjectWithData(data, tealiumUdo.getView(getConfiguration()));
                    populateObjectWithData(data, udoOverrides);

                    $window.utag.link(data);
                }

                /**
                 * Sets the default link data.
                 *
                 * @param {*} value Value to set.
                 */
                function setDefaultLinkData(value)
                {
                    defaultLinkData = value;
                }

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
                    populateObjectWithData(udo, udoOverrides);

                    $window.utag.view(udo);

                    $timeout(indexClickListeners.bind(this, udoOverrides));
                }

                return {
                    getConfiguration: getConfiguration,
                    indexClickListeners: indexClickListeners,
                    link: customLink,
                    setDefaultLinkData: setDefaultLinkData,
                    view: view
                };
            }];
        })
        .run([$windowName, tealiumName, function ($window, tealium)
        {
            var config = tealium.getConfiguration();

            // Should the Tealium be injected?
            if (!config.inject_tealium)
                return;

            // Should the first view be suppressed?
            // This will work ONLY if tealium is being injected.
            if (config.suppress_first_view)
                $window.utag_cfg_ovrd = { noview : true };

            // Injecting tealium script
            (function (a, b, c, d)
            {
                a='//tags.tiqcdn.com/utag/' + config.account + '/' + config.profile + '/' + config.environment + '/utag.js';
                b=document;c='script';d=b.createElement(c);d.src=a;d.type='text/java'+c;d.async=true;
                a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a);
            })();
        }]);
})(angular, document);
