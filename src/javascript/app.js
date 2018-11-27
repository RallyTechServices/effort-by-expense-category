/* global Ext Deft TSUtilities CArABU Constants SummaryItem _ Rally Renderers */
Ext.define("effort-by-expense-category", {
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
            xtype: 'container',
            itemId: Constants.ID.ACCEPTED_DATE_RANGE,
            html: '' // Set from launch
        }, {
            xtype: 'container',
            itemId: 'controlBarPadding',
            flex: 1,
        }, {
            xtype: 'rallybutton',
            itemId: Constants.ID.EXPORT,
            text: Constants.LABEL.EXPORT,
            disabled: true
        }],
    }, {
        xtype: 'tabpanel',
        flex: 1,
        itemId: Constants.ID.TAB_PANEL,
        plain: true,
        items: [{
            xtype: 'container',
            autoScroll: true,
            title: Constants.LABEL.SUMMARY_AREA,
            itemId: Constants.ID.SUMMARY_AREA,
        }, {
            xtype: 'container',
            overflowY: 'scroll',
            title: Constants.LABEL.DETAILS_AREA,
            itemId: Constants.ID.DETAILS_AREA,
        }]
    }],

    startDate: undefined,
    endDate: undefined,

    launch: function() {
        Ext.data.NodeInterface.decorate(SummaryItem);
        // Get references to the date range area
        var dateRange = this.down('#' + Constants.ID.ACCEPTED_DATE_RANGE);
        this.startDate = this.getSetting(Constants.ID.ACCEPTED_START_DATE);
        this.endDate = this.getSetting(Constants.ID.ACCEPTED_END_DATE);
        dateRange.update('<span class="date-range">' + Constants.LABEL.ACCEPTED_DATE_RANGE + ': ' +
            (this.startDate || Constants.LABEL.NOT_SET) +
            ' - ' +
            (this.endDate || Constants.LABEL.NOT_SET) +
            '</span>');

        // Add event handler for export button
        this.down('#' + Constants.ID.EXPORT).on('click', this.onExport, this);

        this.loadData();
    },

    onExport: function(button) {
        button.setDisabled(true);
        // Export the data from the grid on the active tab. Use the tab title as the export filename.
        var activeTab = this.down('#' + Constants.ID.TAB_PANEL).getActiveTab();
        var activeGrid = activeTab.down('tablepanel');
        if (activeTab.itemId === Constants.ID.SUMMARY_AREA) {
            var csv = [];
            var headers = CArABU.technicalservices.FileUtilities._getHeadersFromGrid(activeGrid);
            csv.push('"' + headers.join('","') + '"');
            var store = activeGrid.getStore();
            activeGrid.getRootNode().eachChild(function(child) {
                csv.push(CArABU.technicalservices.FileUtilities._getCSVFromRecord(child, activeGrid, store));
            }, this);
            csv = csv.join('\r\n');
            CArABU.technicalservices.FileUtilities.saveCSVToFile(csv, activeTab.title + '.csv');
            button.setDisabled(false);
        }
        else {
            CArABU.technicalservices.FileUtilities.getCSVFromGrid(this, activeGrid)
                .then(function(csv) {
                    CArABU.technicalservices.FileUtilities.saveCSVToFile(csv, activeTab.title + '.csv');
                    button.setDisabled(false);
                });
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
                        value: new Date(this.startDate).toISOString()
                    },
                    {
                        property: 'AcceptedDate',
                        operator: '<=',
                        value: new Date(this.endDate).toISOString()
                    },
                    {
                        property: 'DirectChildrenCount',
                        value: 0
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

                    // SummaryItem.create() loads
                    // parent PortfolioItems in the background. Waiting to draw the grid
                    // until all the PIs have loaded makes the app look broken. Instead,
                    // render what we have, and the parent PI information will fill in
                    // as it is loaded.
                    var summaryItems = _.map(store.getGroups(), function(group) {
                        var summaryItem = new SummaryItem();
                        summaryItem.createFromGroup(group);
                        return summaryItem;
                    });

                    //this.addSummaryGrid(summaryItems, perTeamPlanEstimateTotals);
                    this.addSummaryTree(summaryItems, perTeamPlanEstimateTotals);
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

    addSummaryTree: function(data, perTeamPlanEstimateTotals) {
        var tableArea = this.down('#' + Constants.ID.SUMMARY_AREA);
        tableArea.removeAll
        var root = new SummaryItem();
        Ext.merge(root, {
            expanded: true,
        });
        root.set('children', data);
        var store = Ext.create('Ext.data.TreeStore', {
            model: 'SummaryItem',
            root: root,
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
            xtype: 'treepanel',
            store: store,
            cls: 'rally-grid',
            minWidth: 1280, // TODO (tj) workaround because horizontal scrolling doesn't show all columns
            padding: '0 0 20 0',
            rootVisible: false,
            columns: [{
                xtype: 'treecolumn',
                text: undefined,
                width: 30,
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.TEAM_NAME,
                dataIndex: 'Project_Name',
                renderer: function(value, meta, record) {
                    // Only show project name for non-leaf
                    if (record.get('leaf')) {
                        return ''
                    }
                    else {
                        return value;
                    }
                },
                _csvIgnoreRender: true,
            }, {
                text: Constants.LABEL.USER_STORY_ID,
                dataIndex: 'UserStory_FormattedId',
                renderer: function(value, meta, record) {
                    if (value == '--') {
                        return '( ' + record.childNodes.length + ' )';
                    }
                    return Renderers.link(value, meta, record, 'UserStory', false);
                },
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.USER_STORY_NAME,
                dataIndex: 'UserStory_Name'
            }, {
                text: Constants.LABEL.DELIVERABLE_ID,
                dataIndex: 'PortfolioItem/Deliverable_FormattedId',
                renderer: function(value, meta, record) {
                    return Renderers.link(value, meta, record, 'PortfolioItem/Deliverable');
                },
                _csvIgnoreRender: true
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
                renderer: function(value, meta, record) {
                    return Renderers.link(value, meta, record, 'PortfolioItem/Project');
                },
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.PI_PROJECT_NAME,
                dataIndex: 'PortfolioItem/Project_Name',
            }, {
                text: Constants.LABEL.INITIATIVE_ID,
                dataIndex: 'PortfolioItem/Initiative_FormattedId',
                renderer: function(value, meta, record) {
                    return Renderers.link(value, meta, record, 'PortfolioItem/Initiative');
                },
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.INITIATIVE_NAME,
                dataIndex: 'PortfolioItem/Initiative_Name'
            }, {
                text: Constants.LABEL.DELIVERABLE_STATE,
                dataIndex: 'PortfolioItem/Deliverable_IsClosed',
                renderer: Renderers.piDeliverableIsClosed,
                _csvIgnoreRender: true
            }],
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
            // For some reason the tree grid REMOVES the children after it has processed them??
            var children = summaryItem.get('children') || summaryItem.childNodes;
            _.forEach(children, function(child) {
                details.push(child);
            });
        });
        tableArea.removeAll();
        var store = Ext.create('Rally.data.custom.Store', {
            data: details,
            sorters: [{
                sorterFn: function(a, b) {
                    var groupString = function(story) {
                        return [
                            story.get('Project_Name'),
                            story.get('PortfolioItem/Deliverable_FormattedId'),
                            story.get('ExpenseCategory')
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
            autoScroll: true,
            //minWidth: 1700, // TODO (tj) workaround because horizontal scrolling doesn't show all columns
            columnCfgs: [{
                text: Constants.LABEL.TEAM_NAME,
                dataIndex: 'Project_Name',
            }, {
                text: Constants.LABEL.USER_STORY_ID,
                dataIndex: 'UserStory_FormattedId',
                renderer: function(value, meta, record) {
                    return Renderers.link(value, meta, record, 'UserStory');
                },
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.USER_STORY_NAME,
                dataIndex: 'UserStory_Name',
            }, {
                text: Constants.LABEL.EXPENSE_CATEGORY,
                dataIndex: 'ExpenseCategory'
            }, {
                text: Constants.LABEL.PLAN_ESTIMATE,
                dataIndex: 'PlanEstimate',
            }, {
                text: Constants.LABEL.OWNER,
                dataIndex: 'Owner_Name',
            }, {
                text: Constants.LABEL.ACCEPTED_DATE,
                dataIndex: 'UserStory_AcceptedDate'
            }, {
                text: Constants.LABEL.PARENT,
                dataIndex: 'Parent_FormattedId',
                renderer: function(value, meta, record) {
                    return Renderers.link(value, meta, record, 'Parent', false);
                },
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.PARENT_NAME,
                dataIndex: 'Parent_Name'
            }, {
                text: Constants.LABEL.DELIVERABLE_ID,
                dataIndex: 'PortfolioItem/Deliverable_FormattedId',
                renderer: function(value, meta, record) {
                    return Renderers.link(value, meta, record, 'PortfolioItem/Deliverable');
                },
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.DELIVERABLE_NAME,
                dataIndex: 'PortfolioItem/Deliverable_Name'
            }, {
                text: Constants.LABEL.PI_PROJECT_ID,
                dataIndex: 'PortfolioItem/Project_FormattedId',
                renderer: function(value, meta, record) {
                    return Renderers.link(value, meta, record, 'PortfolioItem/Project');
                },
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.PI_PROJECT_NAME,
                dataIndex: 'PortfolioItem/Project_Name'
            }, {
                text: Constants.LABEL.INITIATIVE_ID,
                dataIndex: 'PortfolioItem/Initiative_FormattedId',
                renderer: function(value, meta, record) {
                    return Renderers.link(value, meta, record, 'PortfolioItem/Initiative');
                },
                _csvIgnoreRender: true
            }, {
                text: Constants.LABEL.INITIATIVE_NAME,
                dataIndex: 'PortfolioItem/Initiative_Name'
            }, {
                text: Constants.LABEL.DELIVERABLE_STATE,
                dataIndex: 'PortfolioItem/Deliverable_IsClosed',
                renderer: Renderers.piDeliverableIsClosed,
                _csvIgnoreRender: true
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
        return [{
            xtype: 'rallydatefield',
            name: Constants.ID.ACCEPTED_START_DATE,
            fieldLabel: Constants.LABEL.ACCEPTED_START_DATE,
            labelWidth: 150
        }, {
            xtype: 'rallydatefield',
            name: Constants.ID.ACCEPTED_END_DATE,
            fieldLabel: Constants.LABEL.ACCEPTED_END_DATE,
            labelWidth: 150
        }, {
            xtype: 'container',
            itemId: 'padding',
            height: 150
        }];
    }

});
