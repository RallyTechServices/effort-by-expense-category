/* global Ext Deft TSUtilities CArABU Constants SummaryItem _ */
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
        }],
    }, {
        xtype: 'container',
        itemId: Constants.ID.TABLE_AREA,
        layout: 'vbox',
        width: 500,
        height: 500,
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
        this.loadData();

        // Listen for user changes to the dates
        start.on('change', this.onStartDateChange, this);
        end.on('change', this.onEndDateChange, this);

        this.setLoading(false);
    },

    onStartDateChange: function(datePicker, newDate) {
        if (this.startDate != newDate) {
            this.startDate = newDate;
            this.loadData();
        }
    },

    onEndDateChange: function(datePicker, newDate) {
        if (this.endDate != newDate) {
            this.endDate = newDate;
            this.loadData();
        }
    },

    loadData: function() {
        if (this.startDate && this.endDate) {
            var store = Ext.create('Rally.data.wsapi.Store', {
                storeId: Constants.ID.USER_STORY_STORE,
                model: 'HierarchicalRequirement',
                autoLoad: false,
                fetch: Constants.USER_STORY_FIELDS,
                filters: [{
                        property: 'AcceptedDate',
                        operator: '>=',
                        value: this.startDate
                    },
                    {
                        property: 'AcceptedDate',
                        operator: '<=',
                        value: this.endDate
                    }
                ],
                limit: Infinity,
                getGroupString: this.getGroupString
            });
            store.load().then({
                scope: this,
                success: function(records) {
                    console.log(records);
                    console.log(store);
                    var summaryItems = _.map(store.getGroups(), function(group) {
                        return new SummaryItem(group);
                    });
                    this.addGrid(summaryItems);
                }
            });
        }
    },

    addGrid: function(data) {
        var tableArea = this.down('#' + Constants.ID.TABLE_AREA);
        tableArea.removeAll();
        var store = Ext.create('Rally.data.Store', {
            data: data,
            model: SummaryItem
        });
        tableArea.add({
            xtype: 'rallygrid',
            store: store,
            width: 400,
            height: 400,
            columnCfgs: [{
                text: Constants.LABEL.TEAM_NAME,
                dataIndex: 'TeamName'
            }, {
                text: Constants.LABEL.DELIVERABLE_ID,
                dataIndex: 'DeliverableFormattedId'
            }]
        })
    },

    getGroupString: function(instance) {
        var project = instance.get('Project');
        var deliverable = instance.get('Deliverable');
        var expenseCategory = instance.get('c_ExpenseCategory') || 'None';
        var projectOid = project ? project.ObjectID : 'None';
        var deliverableOid = deliverable ? deliverable.ObjectID : 'None';
        return [projectOid, deliverableOid, expenseCategory].join(':');
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
