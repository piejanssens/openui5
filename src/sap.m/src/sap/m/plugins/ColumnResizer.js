/*!
 * ${copyright}
 */

sap.ui.define([
	"./PluginBase",
	"sap/ui/core/Core",
	"sap/ui/core/InvisibleText",
	"sap/ui/Device",
	"sap/ui/thirdparty/jquery",
	"sap/ui/dom/jquery/control", // jQuery Plugin "control"
	"sap/ui/dom/jquery/Aria" // jQuery Plugin "aria"
], function(PluginBase,
	Core,
	InvisibleText,
	Device,
	jQuery
) {
	"use strict";

	/**
	 * Constructor for a new ColumnResizer plugin.
	 *
	 * @param {string} [sId] ID for the new <code>ColumnResizer</code>, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the <code>ColumnResizer</code>
	 *
	 * @class
	 * Enables column resizing for the <code>sap.m.Table</code>.
	 * This plugin can be added to the control via its <code>dependents</code> aggregation
	 * and there must only be 1 instance of the plugin per control.
	 *
	 * @extends sap.m.plugins.PluginBase
	 * @author SAP SE
	 * @version ${version}
	 *
	 * @private
	 * @since 1.87
	 * @alias sap.m.plugins.ColumnResizer
	 */
	var ColumnResizer = PluginBase.extend("sap.m.plugins.ColumnResizer", /** @lends sap.m.plugins.ColumnResizer.prototype */ { metadata: {
		library: "sap.m",
		properties: {
		},
		events: {
			/**
			 * This event is fired when the column is resized.
			 */
			columnResize: {
				allowPreventDefault : true,
				parameters: {
					/**
					 * The column being resized.
					 */
					column: {type: "sap.ui.core.Element"},

					/**
					 * The new width of the column.
					 */
					width : {type : "sap.ui.core.CSSSize"}
				}
			}
		}
	}});


	var oSession = {};
	var bResizing = false;
	var CSS_CLASS = "sapMPluginsColumnResizer";
	var bRTL = Core.getConfiguration().getRTL();
	var sBeginDirection = bRTL ? "right" : "left";
	var sEndDirection = bRTL ? "left" : "right";
	var iDirectionFactor = bRTL ? -1 : 1;

	ColumnResizer.prototype.init = function() {
		this._iHoveredColumnIndex = -1;
		this._aPositions = [];
		this._oHandle = null;
	};

	ColumnResizer.prototype.isApplicable = function(oControl) {
		return oControl.isA(["sap.m.Table"]);
	};

	ColumnResizer.prototype.onActivate = function(oControl) {
		oControl.addEventDelegate(this, this);
		if (oControl.isActive()) {
			this.onAfterRendering();
		}
	};

	ColumnResizer.prototype.onDeactivate = function(oControl) {
		oControl.removeEventDelegate(this, this);
		this.onBeforeRendering();
		this._oHandle = null;
	};

	ColumnResizer.prototype.onBeforeRendering = function() {
		if (this._$Container) {
			this._$Container.removeClass(CSS_CLASS + "Container").off("." + CSS_CLASS);
			this._$Container.find(this.getControlPluginConfig("resizable")).removeClass(CSS_CLASS + "Resizable");
			this._updateAriaDescribedBy("remove");
		}
	};

	ColumnResizer.prototype.onAfterRendering = function() {
		this._$Container = this.getControl().$(this.getControlPluginConfig("container"));
		Device.system.desktop && this._$Container.on("mousemove." + CSS_CLASS, this._onmousemove.bind(this));
		this._$Container.addClass(CSS_CLASS + "Container").on("mouseleave." + CSS_CLASS, this._onmouseleave.bind(this));
		this._aResizables = this._$Container.find(this.getControlPluginConfig("resizable")).addClass(CSS_CLASS + "Resizable").get();
		this._updateAriaDescribedBy("add");
		this._invalidatePositions();
	};

	/**
	 * Adds / removes the aria-describedby attribute from the resizable control DOM.
	 * @param {string} sAction function prefix
	 * @private
	 */
	ColumnResizer.prototype._updateAriaDescribedBy = function(sAction) {
		this._aResizables.forEach(function(oResizable) {
			var oResizableControl = jQuery(oResizable).control(0, true);
			var oFocusDomRef = oResizableControl.getFocusDomRef();
			jQuery(oFocusDomRef)[sAction + "AriaDescribedBy"](InvisibleText.getStaticId("sap.m", "COLUMNRESIZER_RESIZABLE"));
		});
	};

	ColumnResizer.prototype.ontouchstart = function(oEvent) {
		if (this._iHoveredColumnIndex == -1 && this._oHandle && this._oHandle.style[sBeginDirection]) {
			this._onmousemove(oEvent);

			if (this._iHoveredColumnIndex == -1) {
				this._oHandle.style[sBeginDirection] = "";
				this._oAlternateHandle.style[sBeginDirection] = "";
			}
		}

		bResizing = (this._iHoveredColumnIndex > -1);
		if (!bResizing) {
			return;
		}

		oEvent.preventDefault();
		this._startResizeSession(this._iHoveredColumnIndex);
		oSession.iTouchStartX = oEvent.targetTouches[0].clientX;
		oSession.fHandleX = parseFloat(this._oHandle.style[sBeginDirection]);

		this._$Container.addClass(CSS_CLASS + "Resizing");
		jQuery(document).on("touchend." + CSS_CLASS + " mouseup." + CSS_CLASS, this._ontouchend.bind(this));
	};

	ColumnResizer.prototype.ontouchmove = function(oEvent) {
		if (!bResizing) {
			return;
		}

		this._setSessionDistanceX((oEvent.targetTouches[0].clientX - oSession.iTouchStartX));
		this._oHandle.style[sBeginDirection] = oSession.fHandleX + oSession.iDistanceX + "px";
	};

	ColumnResizer.prototype._onmousemove = function(oEvent) {
		if (bResizing) {
			return;
		}

		this._setPositions();

		var iClientX = oEvent.targetTouches ? oEvent.targetTouches[0].clientX : oEvent.clientX;
		var iHoveredColumnIndex = this._aPositions.findIndex(function(fPosition) {
			return Math.abs(fPosition - iClientX) <= (this._oAlternateHandle ? 20 : 3);
		}, this);

		this._displayHandle(iHoveredColumnIndex);
	};

	ColumnResizer.prototype._onmouseleave = function() {
		this._invalidatePositions();
	};

	ColumnResizer.prototype._ontouchend = function() {
		this._setColumnWidth();
		this._cancelResizing();
	};

	ColumnResizer.prototype.onsapescape = function() {
		if (bResizing) {
			this._cancelResizing();
		}
	};

	ColumnResizer.prototype.onsaprightmodifiers = function(oEvent) {
		this._onLeftRightModifiersKeyDown(oEvent, 16);
	};

	ColumnResizer.prototype.onsapleftmodifiers = function(oEvent) {
		this._onLeftRightModifiersKeyDown(oEvent, -16);
	};

	ColumnResizer.prototype._invalidatePositions = function() {
		window.setTimeout(function() {
			this._bPositionsInvalid = true;
		}.bind(this));
	};

	/**
	 * Displays the resize handle on the column which is hovered
	 * @param {integer} iColumnIndex column index
	 * @param {boolean} bMobileHandle indicates whether the alternate handle is visible
	 * @private
	 */
	ColumnResizer.prototype._displayHandle = function(iColumnIndex, bMobileHandle) {
		if (this._iHoveredColumnIndex == iColumnIndex) {
			return;
		}

		if (!this._oHandle) {
			this._oHandle = document.createElement("div");
			this._oHandle.className = CSS_CLASS + "Handle";

			if (bMobileHandle) {
				var oCircle = document.createElement("div");
				oCircle.className = CSS_CLASS + "HandleCircle";
				oCircle.style.top = this._aResizables[iColumnIndex].offsetHeight - 8 + "px";
				this._oHandle.appendChild(oCircle);

				this._oAlternateHandle = this._oHandle.cloneNode(true);
			}
		}

		if (!this._oHandle.parentNode) {
			this._$Container.append(this._oHandle);

			if (bMobileHandle) {
				this._$Container.append(this._oAlternateHandle);
			}
		}

		this._oHandle.style[sBeginDirection] = (iColumnIndex > -1) ? (this._aPositions[iColumnIndex] - this._fContainerX) * iDirectionFactor + "px" : "";

		if (bMobileHandle) {
			this._oAlternateHandle.style[sBeginDirection] = (--iColumnIndex > -1) ? (this._aPositions[iColumnIndex] - this._fContainerX) * iDirectionFactor + "px" : "";
		} else {
			if (this._oAlternateHandle) {
				this._oAlternateHandle.style[sBeginDirection] = "";
			}

			this._iHoveredColumnIndex = iColumnIndex;
		}
	};

	/**
	 * Cancels the resizing session and restores the DOM.
	 * @private
	 */
	ColumnResizer.prototype._cancelResizing = function() {
		this._$Container.removeClass(CSS_CLASS + "Resizing");
		this._oHandle.style[sBeginDirection] = "";
		this._iHoveredColumnIndex = -1;

		jQuery(document).off("." + CSS_CLASS);
		this._endResizeSession();
		bResizing = false;
	};

	ColumnResizer.prototype._getColumnMinWidth = function(oColumn) {
		return oColumn ? 48 : 0;
	};

	/**
	 * This function collects all the necessary information for starting a resize session.
	 * A resize session contains the below information:
	 * - Current column and its width.
	 * - Next column and its width (if available).
	 * - Maximum increase and decrease resize value.
	 * - Existance of dummy column.
	 * @param {integer} iIndex column index
	 * @private
	 */
	ColumnResizer.prototype._startResizeSession = function(iIndex) {
		oSession.$CurrentColumn = jQuery(this._aResizables[iIndex]);
		oSession.oCurrentColumn = oSession.$CurrentColumn.control(0, true);
		oSession.fCurrentColumnWidth = oSession.$CurrentColumn.width();
		oSession.iMaxDecrease = this._getColumnMinWidth(oSession.oCurrentColumn) - oSession.fCurrentColumnWidth;
		oSession.iEmptySpace = this.getControlPluginConfig("emptySpace", -1, this.getControl());

		if (oSession.iEmptySpace != -1) {
			oSession.$NextColumn = jQuery(this._aResizables[iIndex + 1]);
			oSession.oNextColumn = oSession.$NextColumn.control(0, true);
			oSession.fNextColumnWidth = oSession.$NextColumn.width() || 0;
			oSession.iMaxIncrease = oSession.iEmptySpace + oSession.fNextColumnWidth - this._getColumnMinWidth(oSession.oNextColumn);
		} else {
			oSession.iMaxIncrease = window.innerWidth;
		}
	};

	/**
	 * Sets the horizontal resize distance to the session by which the column was increased or decreased.
	 * @param {integer} iDistanceX horizontal resize distance
	 * @private
	 */
	ColumnResizer.prototype._setSessionDistanceX = function(iDistanceX) {
		oSession.iDistanceX = ((iDistanceX > 0) ? Math.min(iDistanceX, oSession.iMaxIncrease) : Math.max(iDistanceX, oSession.iMaxDecrease)) * iDirectionFactor;
	};

	/**
	 * Sets the column widths if the default action of the <code>columnResize</code> event is not prevented.
	 * @private
	 */
	ColumnResizer.prototype._setColumnWidth = function() {
		if (!oSession.iDistanceX) {
			return;
		}

		var sWidth = oSession.fCurrentColumnWidth + oSession.iDistanceX + "px";
		if (!this._fireColumnResize(oSession.oCurrentColumn, sWidth)) {
			return;
		}

		oSession.oCurrentColumn.setWidth(sWidth);

		if (oSession.oNextColumn && (oSession.iEmptySpace < 1 || oSession.iDistanceX > oSession.iEmptySpace)) {
			sWidth = oSession.fNextColumnWidth - oSession.iDistanceX + oSession.iEmptySpace + "px";
			if (this._fireColumnResize(oSession.oNextColumn, sWidth)) {
				oSession.oNextColumn.setWidth(sWidth);
			}
		}

		// when any column is resized, then make all visible columns have fixed width
		this.getControlPluginConfig("fixAutoWidthColumns") && this._aResizables.forEach(function(oResizable) {
			var $Resizable = jQuery(oResizable),
				oColumn = $Resizable.control(0, true),
				sWidth = oColumn.getWidth();

			if (sWidth && sWidth.toLowerCase() != "auto") {
				return;
			}

			sWidth = $Resizable.css("width");
			if (sWidth && this._fireColumnResize(oColumn, sWidth)) {
				oColumn.setWidth(sWidth);
			}
		}, this);
	};

	/**
	 * Fires the column resize event with the relevant parameters.
	 * @param {sap.m.Column|sap.ui.table.Column} oColumn column instance
	 * @param {sap.ui.core.CSSSize} sWidth column width
	 * @private
	 * @return {boolean} prevent defualt
	 */
	ColumnResizer.prototype._fireColumnResize = function(oColumn, sWidth) {
		return this.fireColumnResize({
			column: oColumn,
			width: sWidth
		});
	};

	/**
	 * This function is called when column resizing is trigger via keyboard events <code>onsapleftmodifiers</code> & <code>onsaprightmodifiers</code>.
	 * @param {object} oEvent keyboard event
	 * @param {integer} iDistanceX resize distance
	 * @private
	 */
	ColumnResizer.prototype._onLeftRightModifiersKeyDown = function(oEvent, iDistanceX) {
		if (!oEvent.shiftKey) {
			return;
		}

		var oResizable = jQuery(oEvent.target).closest(this._aResizables)[0],
			iIndex = this._aResizables.indexOf(oResizable);

		if (iIndex === -1) {
			return;
		}

		this._startResizeSession(iIndex);
		this._setSessionDistanceX(iDistanceX);
		this._setColumnWidth();
		this._endResizeSession();
	};

	/**
	 * Ends and cleans up the resize session.
	 * @private
	 */
	ColumnResizer.prototype._endResizeSession = function() {
		oSession = {};
	};

	/**
	 * Sets the container and handle positions. If positions are invalid then calculates first.
	 * @returns {Array} hoverable positions
	 * @private
	 */
	ColumnResizer.prototype._setPositions = function() {
		if (!this._bPositionsInvalid) {
			return this._aPositions;
		}

		this._bPositionsInvalid = false;
		this._fContainerX = this._$Container[0].getBoundingClientRect()[sBeginDirection];
		this._aPositions = this._aResizables.map(function(oResizable, iIndex, aPositions) {
			return oResizable.getBoundingClientRect()[sEndDirection] - (++iIndex == aPositions.length ? 1.25 * iDirectionFactor : 0);
		}, this);
	};

	/**
	 * Displays the resize handle for the provided column <code>DOM</code> reference.
	 * @param {HTMLElement} oDomRef column DOM reference
	 * @protected
	 */
	ColumnResizer.prototype.startResizing = function(oDomRef) {
		var iColumnIndex = this._aResizables.indexOf(oDomRef);
		this._setPositions();
		this._displayHandle(iColumnIndex, true);
	};

	/**
	 * Plugin-specific control configurations.
	 */
	PluginBase.setConfig({
		"sap.m.Table": {
			container: "listUl",
			resizable: ".sapMListTblHeaderCell:not([aria-hidden=true])",
			fixAutoWidthColumns: true,
			onActivate: function(oTable) {
				this._vOrigFixedLayout = oTable.getFixedLayout();
				oTable.setFixedLayout("Strict");
			},
			onDeactivate: function(oTable) {
				oTable.setFixedLayout(this._vOrigFixedLayout);
				delete this._vOrigFixedLayout;
			},
			emptySpace: function(oTable) {
				var oDummyCell = oTable.getDomRef("tblHeadDummyCell");
				return oDummyCell ? oDummyCell.clientWidth : 0;
			}
		}
	}, ColumnResizer);

	return ColumnResizer;

});