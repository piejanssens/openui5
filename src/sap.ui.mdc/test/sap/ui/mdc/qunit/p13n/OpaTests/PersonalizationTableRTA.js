sap.ui.define([
	'sap/ui/test/Opa5',
	'sap/ui/test/opaQunit',
	'test-resources/sap/ui/mdc/qunit/p13n/OpaTests/utility/Arrangement',
	'test-resources/sap/ui/mdc/qunit/p13n/OpaTests/utility/Util',
	'test-resources/sap/ui/mdc/qunit/p13n/OpaTests/utility/Action',
	'test-resources/sap/ui/mdc/qunit/p13n/OpaTests/utility/Assertion',
	'sap/ui/Device'
], function (Opa5, opaTest, Arrangement, TestUtil, Action, Assertion, Device) {
	'use strict';

	if (window.blanket) {
		//window.blanket.options("sap-ui-cover-only", "sap/ui/mdc");
		window.blanket.options("sap-ui-cover-never", "sap/viz");
	}

	Opa5.extendConfig({
		arrangements: new Arrangement(),
		actions: new Action(),
		assertions: new Assertion(),
		viewNamespace: "view.",
		autowait: true
	});

	var aTableItems = [
		{p13nItem: "Name", selected: true},
		{p13nItem: "Founding Year", selected: true},
		{p13nItem: "Changed By", selected: true},
		{p13nItem: "Created On", selected: true},
		{p13nItem: "artistUUID", selected: false},
		{p13nItem: "Breakout Year", selected: false},
		{p13nItem: "Changed On", selected: false},
		{p13nItem: "City of Origin", selected: false},
		{p13nItem: "Country", selected: false},
		{p13nItem: "Created (Complex)", selected: false},
		{p13nItem: "Created By", selected: false},
		{p13nItem: "regionOfOrigin_code", selected: false}
	];

	// ----------------------------------------------------------------
	// initialize application
	// ----------------------------------------------------------------
	opaTest("When I start the 'appUnderTestTable' app, the table should appear and contain some columns", function (Given, When, Then) {
		//insert application
		Given.iStartMyAppInAFrame({
			source: 'test-resources/sap/ui/mdc/qunit/p13n/OpaTests/appUnderTestTable/TableOpaApp.html',
			autoWait: true
		});
		When.iLookAtTheScreen();

		//check icons
		Then.iShouldSeeButtonWithIcon(Arrangement.P13nDialog.Settings.Icon);

		//check initially visible columns
		Then.iShouldSeeVisibleColumnsInOrder("sap.ui.mdc.table.Column", [
			"name", "foundingYear", "modifiedBy", "createdAt"
		]);

		Then.theVariantManagementIsDirty(false);
	});

	// ----------------------------------------------------------------
	// start and enable RTA
	// ----------------------------------------------------------------
	opaTest("When I enable key user adaptation, the App should change into 'RTA' mode", function(Given, When, Then){
		When.iPressButtonWithText("Start RTA");

		Then.iShouldSeeRTABar();
	});

	// ----------------------------------------------------------------
	// open RTA settings
	// ----------------------------------------------------------------
	opaTest("When I press on the Table, the settings context menu opens", function (Given, When, Then) {
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");
		Then.iShouldSeeRTAPopoverWithActions(2);
		When.iClickOnRtaSetting("sap-icon://key-user-settings");

		Then.iShouldSeeDialogTitle(Arrangement.P13nDialog.Titles.settings);

		Then.iShouldSeeP13nItems(aTableItems);
	});

	// ----------------------------------------------------------------
	// close modal dialog with 'OK'
	// ----------------------------------------------------------------
	opaTest("When I close the 'Add/Remove Columns' button, the table has not been changed", function (Given, When, Then) {

		//close dialog
		Device.system.phone ? When.iPressOnButtonWithIcon(Arrangement.P13nDialog.Settings.Back) : Given.closeModalDialog("OK");

		//check initially visible columns
		Then.iShouldSeeVisibleColumnsInOrder("sap.ui.mdc.table.Column", [
			"name", "foundingYear", "modifiedBy", "createdAt"
		]);

		//check dirty flag
		Then.theVariantManagementIsDirty(false);
	});

	// ----------------------------------------------------------------
	// Move a Column to the top
	// ----------------------------------------------------------------
	opaTest("When I select the 'Country' column and move it to the top, the table should be changed", function (Given, When, Then) {

		//as the Table overlay is still marked as selected, we need to click it twice..
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");

		Then.iShouldSeeRTAPopoverWithActions(2);
		When.iClickOnRtaSetting("sap-icon://key-user-settings");

		Then.iShouldSeeDialogTitle(Arrangement.P13nDialog.Titles.settings);

		When.iSelectColumn("Country", undefined, aTableItems);

		When.iClickOnTableItem("Country").and.iPressOnButtonWithIcon(Arrangement.P13nDialog.Settings.MoveToTop);

		Then.iShouldSeeP13nItem("Country", 0);
		Then.iShouldSeeP13nItem("Name", 1);
		Then.iShouldSeeP13nItem("Founding Year", 2);
		Then.iShouldSeeP13nItem("Changed By", 3);
		Then.iShouldSeeP13nItem("Created On", 4);
	});

	// ----------------------------------------------------------------
	// close modal dialog with 'OK' and check reorderd columns
	// ----------------------------------------------------------------
	opaTest("When I close the 'Add/Remove Columns' button, the table has not been changed", function (Given, When, Then) {

		//close dialog
		Given.closeModalDialog("OK");

		//check initially visible columns
		Then.iShouldSeeVisibleColumnsInOrderInTable("sap.ui.mdc.Table", "sap.ui.mdc.table.Column", [
			"countryOfOrigin_code", "name", "foundingYear", "modifiedBy", "createdAt"
		]);
	});

	// ----------------------------------------------------------------
	// Select two columns, but discard the changes via 'cancel' --> Table should remain unchanged
	// ----------------------------------------------------------------
	opaTest("When I select columns and cancel, the changes should discard", function (Given, When, Then) {

		//as the Table overlay is still marked as selected, we need to click it twice..
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");
		Then.iShouldSeeRTAPopoverWithActions(2);
		When.iClickOnRtaSetting("sap-icon://key-user-settings");

		Then.iShouldSeeDialogTitle(Arrangement.P13nDialog.Titles.settings);

		When.iSelectColumn("Breakout Year", Arrangement.P13nDialog.Titles.settings, aTableItems);
		When.iSelectColumn("regionOfOrigin_code", Arrangement.P13nDialog.Titles.settings, aTableItems);

		When.iClickOnTableItem("Breakout Year").and.iPressOnButtonWithIcon(Arrangement.P13nDialog.Settings.MoveToTop);
		When.iClickOnTableItem("regionOfOrigin_code").and.iPressOnButtonWithIcon(Arrangement.P13nDialog.Settings.MoveToTop);

		Then.iShouldSeeP13nItem("regionOfOrigin_code", 0);
		Then.iShouldSeeP13nItem("Breakout Year", 1);
		Then.iShouldSeeP13nItem("Country", 2);
		Then.iShouldSeeP13nItem("Name", 3);
		Then.iShouldSeeP13nItem("Founding Year", 4);
		Then.iShouldSeeP13nItem("Changed By", 5);
		Then.iShouldSeeP13nItem("Created On", 6);

		//cancel dialog
		Given.closeModalDialog("Cancel");

		//check initially visible columns
		Then.iShouldSeeVisibleColumnsInOrderInTable("sap.ui.mdc.Table", "sap.ui.mdc.table.Column", [
			"countryOfOrigin_code", "name", "foundingYear", "modifiedBy", "createdAt"
		]);

	});

	// ----------------------------------------------------------------
	// Select two columns
	// ----------------------------------------------------------------
	opaTest("When I select two additional columns and move them one up, the table should be changed", function (Given, When, Then) {

		//as the Table overlay is still marked as selected, we need to click it twice..
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");
		Then.iShouldSeeRTAPopoverWithActions(2);
		When.iClickOnRtaSetting("sap-icon://key-user-settings");

		Then.iShouldSeeDialogTitle(Arrangement.P13nDialog.Titles.settings);

		When.iSelectColumn("Breakout Year", Arrangement.P13nDialog.Titles.settings, aTableItems);
		When.iSelectColumn("regionOfOrigin_code", Arrangement.P13nDialog.Titles.settings, aTableItems);

		When.iClickOnTableItem("Breakout Year").and.iPressOnButtonWithIcon(Arrangement.P13nDialog.Settings.MoveToTop);
		When.iClickOnTableItem("regionOfOrigin_code").and.iPressOnButtonWithIcon(Arrangement.P13nDialog.Settings.MoveToTop);

		Then.iShouldSeeP13nItem("regionOfOrigin_code", 0);
		Then.iShouldSeeP13nItem("Breakout Year", 1);
		Then.iShouldSeeP13nItem("Country", 2);
		Then.iShouldSeeP13nItem("Name", 3);
		Then.iShouldSeeP13nItem("Founding Year", 4);
		Then.iShouldSeeP13nItem("Changed By", 5);
		Then.iShouldSeeP13nItem("Created On", 6);

	});

	// ----------------------------------------------------------------
	// close modal dialog with 'OK' and check reorderd columns
	// ----------------------------------------------------------------
	opaTest("When I close the 'Add/Remove Columns' button, the table has not been changed", function (Given, When, Then) {

		//close dialog
		Given.closeModalDialog("OK");

		//check initially visible columns
		Then.iShouldSeeVisibleColumnsInOrderInTable("sap.ui.mdc.Table", "sap.ui.mdc.table.Column", [
			"regionOfOrigin_code", "breakupYear", "countryOfOrigin_code", "name", "foundingYear", "modifiedBy", "createdAt"
		]);
	});

	// ----------------------------------------------------------------
	// Reopen the dialog to see if it the items have been rearranged
	// ----------------------------------------------------------------
	opaTest("Reopen the dialog to see if it the items have been rearranged", function (Give, When, Then) {

		var aTableItems = [
			{p13nItem: "regionOfOrigin_code", selected: true},
			{p13nItem: "Breakout Year", selected: true},
			{p13nItem: "Country", selected: true},
			{p13nItem: "Name", selected: true},
			{p13nItem: "Founding Year", selected: true},
			{p13nItem: "Changed By", selected: true},
			{p13nItem: "Created On", selected: true},
			{p13nItem: "artistUUID", selected: false},
			{p13nItem: "Changed On", selected: false},
			{p13nItem: "City of Origin", selected: false},
			{p13nItem: "Created (Complex)", selected: false},
			{p13nItem: "Created By", selected: false}
		];

		//Reopen the dialog
		//as the Table overlay is still marked as selected, we need to click it twice..
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");
		When.iClickOnOverlayForControl("sap.ui.mdc.Table");
		Then.iShouldSeeRTAPopoverWithActions(2);
		When.iClickOnRtaSetting("sap-icon://key-user-settings");
		Then.iShouldSeeDialogTitle(Arrangement.P13nDialog.Titles.settings);

		Then.iShouldSeeP13nItems(aTableItems);

	});

	// ----------------------------------------------------------------
	// Assert the order of columns
	// ----------------------------------------------------------------
	opaTest("check 'order' of columns", function (Given, When, Then) {
		//Reorder table items
		Then.iShouldSeeP13nItem("regionOfOrigin_code", 0);
		Then.iShouldSeeP13nItem("Breakout Year", 1);
		Then.iShouldSeeP13nItem("Country", 2);
		Then.iShouldSeeP13nItem("Name", 3);
		Then.iShouldSeeP13nItem("Founding Year", 4);
		Then.iShouldSeeP13nItem("Changed By", 5);
		Then.iShouldSeeP13nItem("Created On", 6);
	});

	opaTest("check column items", function (Given, When, Then) {
		//Select table items
		Then.iShouldSeeP13nItem("regionOfOrigin_code", 0, true);
		Then.iShouldSeeP13nItem("Breakout Year", 1, true);
		Then.iShouldSeeP13nItem("Country", 2, true);
		Then.iShouldSeeP13nItem("Name", 3, true);
		Then.iShouldSeeP13nItem("Founding Year", 4, true);
		Then.iShouldSeeP13nItem("Changed By", 5, true);
		Then.iShouldSeeP13nItem("Created On", 6, true);
		Then.iShouldSeeP13nItem("artistUUID", 7, false);
		Then.iShouldSeeP13nItem("Changed On", 8, false);
		Then.iShouldSeeP13nItem("City of Origin", 9, false);
		Then.iShouldSeeP13nItem("Created (Complex)", 10, false);
		Then.iShouldSeeP13nItem("Created By", 11, false);
		Given.closeModalDialog("OK");
	});

	opaTest("Quit RTA", function(Given, When, Then){
		//Quit RTA
		When.iPressButtonWithText("Save & Exit");

		//Just to check that runtime Dialog opens again (no more overlays)
		When.iPressOnButtonWithIcon(Arrangement.P13nDialog.Settings.Icon);

		//close Dialog
		When.iPressDialogOk();
		Then.thePersonalizationDialogShouldBeClosed();

		//tear down app
		Given.enableAndDeleteLrepLocalStorage();
		Then.iTeardownMyAppFrame();
	});

});
