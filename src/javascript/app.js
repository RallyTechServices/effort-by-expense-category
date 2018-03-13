/* global Ext Deft TSUtilities CArABU Constants SummaryItem _ */
Ext.define("CArABU.app.TSApp", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    defaults: { margin: 10 },
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    integrationHeaders: {
        name: "CArABU.app.TSApp"
    },
    logger: new CArABU.technicalservices.Logger(),

    items: [{
        xtype: 'container',
        layout: {
            type: 'hbox',
            pack: 'end',
        },
        items: [{
            xtype: 'rallydatefield',
            region: 'west',
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
        }, {
            xtype: 'container',
            region: 'center',
            flex: 1,
        }, {
            xtype: 'rallybutton',
            itemId: Constants.ID.EXPORT,
            text: Constants.LABEL.EXPORT,
            disabled: true
        }],
    }, {
        xtype: 'tabpanel',
        itemId: Constants.ID.TAB_PANEL,
        plain: true,
        items: [{
            xtype: 'container',
            title: Constants.LABEL.SUMMARY_AREA,
            itemId: Constants.ID.SUMMARY_AREA,
            layout: {
                type: 'vbox',
                align: 'stretch'
            }
        }, {
            xtype: 'container',
            title: Constants.LABEL.DETAILS_AREA,
            itemId: Constants.ID.DETAILS_AREA,
            layout: {
                type: 'vbox',
                align: 'stretch'
            }
        }]
    }],

    startDate: undefined,
    endDate: undefined,

    launch: function() {
        // Get references to the date controls
        var start = this.down('#' + Constants.ID.ACCEPTED_START_DATE);
        var end = this.down('#' + Constants.ID.ACCEPTED_END_DATE);

        // Get their current values from their saved state (this happens before app launch is called)
        this.startDate = start.getValue();
        this.endDate = end.getValue();

        // Listen for user changes to the dates
        start.on('change', this.onStartDateChange, this);
        end.on('change', this.onEndDateChange, this);

        // Add event handler for export button
        this.down('#' + Constants.ID.EXPORT).on('click', this.onExport, this);

        this.loadData();
    },

    onExport: function(button) {
        button.setDisabled(true);
        // Export the data from the grid on the active tab. Use the tab title as the export filename.
        var activeTab = this.down('#' + Constants.ID.TAB_PANEL).getActiveTab();
        var activeGrid = activeTab.down('rallygrid');
        CArABU.technicalservices.FileUtilities.getCSVFromGrid(this, activeGrid)
            .then(function(csv) {
                CArABU.technicalservices.FileUtilities.saveCSVToFile(csv, activeTab.title + '.csv');
                button.setDisabled(false);
            });
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
            this.setLoading(true);
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
                    var perTeamPlanEstimateTotals = _.reduce(records, function(accumulator, record) {
                        var planEstimateTotal = accumulator[record.get('Project').ObjectID] || 0;
                        planEstimateTotal += record.get('PlanEstimate');
                        accumulator[record.get('Project').ObjectID] = planEstimateTotal;
                        return accumulator
                    }, {});
                    var summaryItems = _.map(store.getGroups(), function(group) {
                        return new SummaryItem(group);
                    });
                    this.addSummaryGrid(summaryItems, perTeamPlanEstimateTotals);
                    this.addDetailsGrid(summaryItems);
                    this.setLoading(false);
                }
            });
        }
    },

    setLoading: function(disabled) {
        this.callParent(arguments);
        this.down('#' + Constants.ID.EXPORT).setDisabled(disabled);
    },

    addSummaryGrid: function(data, perTeamPlanEstimateTotals) {
        var tableArea = this.down('#' + Constants.ID.SUMMARY_AREA);
        tableArea.removeAll();
        var store = Ext.create('Rally.data.custom.Store', {
            data: data,
            model: SummaryItem,
            // By default sort by Project Name + Deliverable ID + Expense category
            sorters: [{
                sorterFn: function(a, b) {
                    var groupString = function(summaryItem) {
                        return [
                            summaryItem.get('Project_Name'),
                            summaryItem.get('PortfolioItem/Deliverable_FormattedId'),
                            summaryItem.get('ExpenseCategory')
                        ].join(':');
                    }
                    var aStr = groupString(a);
                    var bStr = groupString(b);
                    if (aStr < bStr) {
                        return -1;
                    }
                    else if (aStr > bStr) {
                        return 1;
                    }
                    else {
                        return 0;
                    }
                }
            }]
        });
        tableArea.add({
            xtype: 'rallygrid',
            store: store,
            enableEditing: false,
            showRowActionsColumn: false,
            columnCfgs: [{
                text: Constants.LABEL.TEAM_NAME,
                dataIndex: 'Project_Name',
                flex: 1,
            }, {
                text: Constants.LABEL.DELIVERABLE_ID,
                dataIndex: 'PortfolioItem/Deliverable_FormattedId',
                renderer: function(value, meta) {
                    if (!value) {
                        meta.tdCls = 'has-error'
                    }
                    return value;
                }
            }, {
                text: Constants.LABEL.EXPENSE_CATEGORY,
                dataIndex: 'ExpenseCategory'
            }, {
                text: Constants.LABEL.PCT_EFFORT,
                dataIndex: 'PlanEstimate',
                renderer: function(value, meta, record) {
                    var teamPlanEstimateTotal = perTeamPlanEstimateTotals[record.get('Project').ObjectID]
                    return (value / teamPlanEstimateTotal * 100).toFixed(2) + '%';
                }
            }, {
                text: Constants.LABEL.DELIVERABLE_NAME,
                dataIndex: 'PortfolioItem/Deliverable_Name'
            }, {
                text: Constants.LABEL.PI_PROJECT_ID,
                dataIndex: 'PortfolioItem/Project_FormattedId',
                renderer: function(value, meta) {
                    if (!value) {
                        meta.tdCls = 'has-error'
                    }
                    return value
                }
            }, {
                text: Constants.LABEL.PI_PROJECT_NAME,
                dataIndex: 'PortfolioItem/Project_Name',
            }, {
                text: Constants.LABEL.INITIATIVE_ID,
                dataIndex: 'PortfolioItem/Initiative_FormattedId',
                renderer: function(value, meta) {
                    if (!value) {
                        meta.tdCls = 'has-error'
                    }
                    return value
                }
            }, {
                text: Constants.LABEL.INITIATIVE_NAME,
                dataIndex: 'PortfolioItem/Initiative_Name'
            }, {
                text: Constants.LABEL.DELIVERABLE_STATE,
                dataIndex: 'PortfolioItem/Deliverable_State',
                renderer: function(value, meta, record) {
                    // Show a blank value UNLESS the state is done. If so, show an error icon
                    // and mark the cell so a CSS rule can highlight the entire row
                    var result = '';
                    if (value == 'Done') {
                        result = '<span class="icon-ok icon-2x"><span>';
                        meta.tdCls = 'has-error';
                    }
                    return result;
                }
            }]
        });
    },

    addDetailsGrid: function(summaryItems) {
        var tableArea = this.down('#' + Constants.ID.DETAILS_AREA);
        // Build details data from each child in the SummaryItems. For each child,
        // set the SummaryItem fields as SummaryItem_FieldName to allow for easy
        // sorting of the columns using dataIndex (rather than requiring custom sort and render
        // functions).
        var summaryItemFields = SummaryItem.getFields();
        var details = [];
        _.forEach(summaryItems, function(summaryItem) {
            _.forEach(summaryItem.get('Children'), function(child) {
                details.push(child);
            });
        });
        tableArea.removeAll();
        var store = Ext.create('Rally.data.custom.Store', {
            data: details,
        });
        tableArea.add({
            xtype: 'rallygrid',
            store: store,
            enableEditing: false,
            showRowActionsColumn: false,
            columnCfgs: [{
                text: Constants.LABEL.TEAM_NAME,
                dataIndex: 'SummaryItem_Project_Name',
                flex: 1
            }, {
                text: Constants.LABEL.USER_STORY_ID,
                dataIndex: 'FormattedID'
            }, {
                text: Constants.LABEL.PARENT,
                dataIndex: 'Parent_FormattedId'
            }, {
                text: Constants.LABEL.DELIVERABLE_ID,
                dataIndex: 'SummaryItem_PortfolioItem/Deliverable_FormattedId'
            }, {
                text: Constants.LABEL.DELIVERABLE_NAME,
                dataIndex: 'SummaryItem_PortfolioItem/Deliverable_Name'
            }, {
                text: Constants.LABEL.EXPENSE_CATEGORY,
                dataIndex: 'c_ExpenseCategory'
            }, {
                text: Constants.LABEL.PI_PROJECT_ID,
                dataIndex: 'SummaryItem_PortfolioItem/Project_FormattedId'
            }, {
                text: Constants.LABEL.PI_PROJECT_NAME,
                dataIndex: 'SummaryItem_PortfolioItem/Project_Name'
            }, {
                text: Constants.LABEL.INITIATIVE_ID,
                dataIndex: 'SummaryItem_PortfolioItem/Initiative_FormattedId'
            }, {
                text: Constants.LABEL.INITIATIVE_NAME,
                dataIndex: 'SummaryItem_PortfolioItem/Initiative_Name'
            }, {
                text: Constants.LABEL.DELIVERABLE_STATE,
                dataIndex: 'SummaryItem_PortfolioItem/Deliverable_State'
            }, {
                text: Constants.LABEL.OWNER,
                dataIndex: 'Owner_Name'
            }, {
                text: Constants.LABEL.ACCEPTED_DATE,
                dataIndex: 'AcceptedDate'
            }]
        });
    },

    /**
     * Group user stories by Project Name + Deliverable ID + Expense Category
     */
    getGroupString: function(instance) {
        var project = instance.get('Project');
        var deliverable = instance.get('Deliverable');
        var expenseCategory = instance.get('c_ExpenseCategory') || 'None';
        var projectName = project ? project.Name : 'None';
        var deliverableName = deliverable ? deliverable.Name : 'None';
        return [projectName, deliverableName, expenseCategory].join(':');
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
