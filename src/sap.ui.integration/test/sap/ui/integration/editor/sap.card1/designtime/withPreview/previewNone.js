sap.ui.define(["sap/ui/integration/Designtime"
], function (Designtime) {
	"use strict";
	return function () {
		return new Designtime({
			"form": {
				"items": {
					"stringParameter": {
						"manifestpath": "/sap.card1/configuration/parameters/stringParameter/value",
						"type": "string"
					}
				}
			},
			"preview": {
				"modes": "None"
			}
		});
	};
});
