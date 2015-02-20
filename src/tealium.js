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
            var viewMap = {};

            /**
             * Gets the view data.
             *
             * @param config Tealium configuration.
             * @returns {*}
             */
            function udoService(config)
            {
                return viewMap[config.viewId] || genericView;
            }

            /**
             * Registers new view in the Tealium udo service.
             *
             * @param viewName Name of the view to register.
             * @param view View data.
             */
            udoService.registerView = function (viewName, view)
            {
                viewMap[viewName] = view;
            };

            /**
             * Sets the view data for generic view.
             *
             * @param view View data to set.
             */
            udoService.setGenericView = function (view)
            {
                genericView = view;
            };

            return udoService;
        })
        .provider(tealiumName, ['$location', $windowName, tealiumUdoName, function ($location, $window, tealiumUdo)
        {
            /**
             * Configuration set by the class.
             * This is the place where default configuration lies.
             * @type {{account: string, defaultPath: string, environment: string, profile: string, suppressFirstView: boolean, uiSelectors: string}}
             */
            var configuration =
            {
                account: "",
                defaultPath: "/",
                environment: "dev",
                injectTealium: true,
                profile: "",
                suppressFirstView: true,
                uiSelectors: '.trackable, input'
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
            this.$get = function ()
            {
                /**
                 * Gets the configuration.
                 * @returns {*}
                 */
                function getConfiguration()
                {
                    var configuration = populateObjectWithData({}, configuration);

                    configuration.viewId = $location.path();

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

                    var customData = (e.target.attributes["data-" + tealiumName] || {}).value;
                    if (customData)
                    {
                        populateObjectWithData(data, JSON.parse(customData));
                    }

                    $window.utag.link(data);
                }

                /**
                 * Informs the application that the view was loaded.
                 *
                 * @binds click events to the elements on the screen.
                 */
                function view()
                {
                    if (!$window.utag)
                        return;

                    var udo = tealiumUdo(getConfiguration());

                    $window.utag.view(udo);

                    angular.element(document.querySelectorAll(configuration.uiSelectors))
                        .bind('click', function (e)
                        {
                            link(udo, e);
                        });
                }

                return {
                    getConfiguration: getConfiguration,
                    view: view
                };
            };
        }])
        .run([$windowName, tealiumName, function ($window, tealium)
        {
            var config = tealium.getConfiguration();

            // Should the first view be suppressed?
            if (config.suppressFirstView)
                $window.utag_cfg_ovrd = { noview : true };

            // Should the Tealium be injected?
            if (!config.injectTealium)
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
