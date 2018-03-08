/* global Ext Deft TSUtilities CArABU Constants */
Ext.define("CArABU.app.TSApp", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    defaults: { margin: 10 },
    layout: 'vbox',
    integrationHeaders: {
        name: "CArABU.app.TSApp"
    },
    logger: new CArABU.technicalservices.Logger(),

    items: [{
        xtype: 'container',
        layout: {
            type: 'hbox',
        },
        items: [{
            xtype: 'rallydatefield',
            itemId: Constants.ID.ACCEPTED_START_DATE,
            fieldLabel: Constants.LABEL.ACCEPTED_START_DATE,
            stateful: true,
            stateId: Constants.ID.ACCEPTED_START_DATE
        }, {
            xtype: 'rallydatefield',
            itemId: Constants.ID.ACCEPTED_END_DATE,
            fieldLabel: Constants.LABEL.ACCEPTED_END_DATE,
            padding: '0 0 0 20',
            stateful: true,
            stateId: Constants.ID.ACCEPTED_END_DATE
        }]
    }],

    startDate: undefined,
    endDate: undefined,

    launch: function() {
        this.setLoading("Loading stuff...");
        // Get references to the date controls
        var start = this.down('#' + Constants.ID.ACCEPTED_START_DATE);
        var end = this.down('#' + Constants.ID.ACCEPTED_END_DATE);

        // Get their current values from their saved state (this happens before app launch is called)
        this.startDate = start.getValue();
        this.endDate = end.getValue();

        // Listen for user changes to the dates
        start.on('change', this.onStartDateChange, this);
        end.on('change', this.onEndDateChange, this);

        this.setLoading(false);
    },

    onStartDateChange: function(datePicker, newDate) {
        this.startDate = newDate;
    },

    onEndDateChange: function(datePicker, newDate) {
        this.endDate = newDate;
    },

    showGrids: function() {
        //if (this)
    },

    getSettingsFields: function() {
        return [];
    },

    getOptions: function() {
        var options = [{
            text: 'About...',
            handler: this._launchInfo,
            scope: this
        }];

        return options;
    },

    _launchInfo: function() {
        if (this.about_dialog) { this.about_dialog.destroy(); }

        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink', {
            showLog: this.getSetting('saveLog'),
            logger: this.logger
        });
    },

    isExternal: function() {
        return typeof(this.getAppId()) == 'undefined';
    }

});
