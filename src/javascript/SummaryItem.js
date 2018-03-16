/* global Ext _ SummaryItem Deft Constants */

/**
 * NOTE: All individual fields needed by the summary and detail grids are placed
 * as top level fields to allow easy column sorting. The alternative of only setting
 * objects here and using template columns or custom renderers would then require
 * writing custom sorting functions for each column.
 */
Ext.define("SummaryItem", {
    extend: 'Ext.data.Model',
    fields: [{
        name: 'Project',
        type: 'auto'
    }, {
        name: 'Project_Name',
        type: 'string'
    }, {
        name: 'PortfolioItem/Deliverable',
        type: 'auto'
    }, {
        name: 'PortfolioItem/Deliverable_FormattedId',
        type: 'string'
    }, {
        name: 'PortfolioItem/Deliverable_Name',
        type: 'string'
    }, {
        name: 'PortfolioItem/Deliverable_State',
        type: 'string'
    }, {
        name: 'ExpenseCategory',
        type: 'string'
    }, {
        name: 'PlanEstimate',
        type: 'float'
    }, {
        name: 'PortfolioItem/Project',
        type: 'auto'
    }, {
        name: 'PortfolioItem/Project_FormattedId',
        type: 'string',
        defaultValue: Constants.LABEL.LOADING
    }, {
        name: 'PortfolioItem/Project_Name',
        type: 'string',
        defaultValue: Constants.LABEL.LOADING
    }, {
        name: 'PortfolioItem/Initiative',
        type: 'auto'
    }, {
        name: 'PortfolioItem/Initiative_FormattedId',
        type: 'string',
        defaultValue: Constants.LABEL.LOADING
    }, {
        name: 'PortfolioItem/Initiative_Name',
        type: 'string',
        defaultValue: Constants.LABEL.LOADING
    }, {
        name: 'Children',
        type: 'auto'
    }],

    /**
     * Create a SummaryItem and loads parent PortfolioItem information in
     * the background. Any parent PI data that wasn't part of the group data
     * has a default value of 'Loading...' (above) and is either cleared when
     * we know there isn't a PI, or updated with the actual PI data in the
     * background.
     */
    constructor: function(group) {
        this.callParent(arguments);

        var firstItem = group.children[0];
        var project = firstItem.get('Project');

        this.set('Children', group.children);

        if (project) {
            this.set('Project', project);
            this.set('Project_Name', project.Name)
        }

        this.set('ExpenseCategory', firstItem.get('c_ExpenseCategory'));
        var groupPlanEstimate = _.reduce(group.children, function(accumulator, story) {
            return accumulator += story.get('PlanEstimate');
        }, 0);
        this.set('PlanEstimate', groupPlanEstimate);

        this.annotateChildren();

        this.loadParentPis(firstItem)
            .then({
                scope: this,
                success: function() {
                    // Re-annotate the children after PI data loaded
                    this.annotateChildren();
                    return this;
                }
            });
    },

    loadParentPis: function(firstItem) {
        var deferred = Ext.create('Deft.Deferred');

        var deliverable = firstItem.get('Deliverable');
        if (deliverable) {
            this.set('PortfolioItem/Deliverable', deliverable);
            this.set('PortfolioItem/Deliverable_FormattedId', deliverable.FormattedID);
            this.set('PortfolioItem/Deliverable_Name', deliverable.Name);
            if (deliverable.State) {
                this.set('PortfolioItem/Deliverable_State', deliverable.State.Name);
            }

            // If this is a child of another story, Deliverable.Parent won't be set
            // (even if that Deliverable has a parent PI). Fetch the full Deliverable
            // to get PortfolioItem/Project information
            return this.loadFullPortfolioItem(deliverable)
                .then({
                    scope: this,
                    success: function(fullDeliverable) {
                        var portfolioItem_Project = fullDeliverable.get('Parent');
                        if (portfolioItem_Project) {
                            this.set('PortfolioItem/Project', portfolioItem_Project);
                            this.set('PortfolioItem/Project_FormattedId', portfolioItem_Project.FormattedID);
                            this.set('PortfolioItem/Project_Name', portfolioItem_Project.Name);
                            return this.loadFullPortfolioItem(portfolioItem_Project);
                        }
                        else {
                            // No parent PortfolioItem/Project, clear the loading indicators for parent PortfolioItems
                            this.set('PortfolioItem/Project_FormattedId');
                            this.set('PortfolioItem/Project_Name');
                            this.set('PortfolioItem/Initiative_FormattedId');
                            this.set('PortfolioItem/Initiative_Name');
                            return null;
                        }
                    }
                })
                .then({
                    scope: this,
                    success: function(fullPortfolioItemProject) {
                        if (fullPortfolioItemProject) {
                            var initiative = fullPortfolioItemProject.get('Parent');
                            if (initiative) {
                                this.set('PortfolioItem/Initiative', initiative);
                                this.set('PortfolioItem/Initiative_FormattedId', initiative.FormattedID);
                                this.set('PortfolioItem/Initiative_Name', initiative.Name);
                            }
                            else {
                                // No parent PortfolioItem/Initiative, clear the loading indicators for parent PortfolioItems
                                this.set('PortfolioItem/Initiative_FormattedId');
                                this.set('PortfolioItem/Initiative_Name');
                                return null;
                            }
                        }
                        deferred.resolve();
                    }
                })
        }
        else {
            // No deliverable, clear the loading indicators for parent PortfolioItems
            this.set('PortfolioItem/Project_FormattedId');
            this.set('PortfolioItem/Project_Name');
            this.set('PortfolioItem/Initiative_FormattedId');
            this.set('PortfolioItem/Initiative_Name');
            deferred.resolve();
        }
        return deferred.promise;
    },

    loadFullPortfolioItem: function(partialItem) {
        return Ext.create('Rally.data.wsapi.Store', {
                model: partialItem._type,
                fetch: ['ObjectID', 'FormattedID', 'Name', 'Parent'],
                filters: [{
                    property: 'ObjectID',
                    value: partialItem.ObjectID
                }],
                autoLoad: false,
                context: {
                    project: null
                }
            })
            .load()
            .then(function(records) {
                if (records.length) {
                    return records[0]
                }
                else {
                    return null;
                }
            })
    },

    // Add the summary item values to each child as a field prefixed with 'SummaryItem_'.
    // This allows easy use of the children values in grids without needing custom sort
    // and render functions.
    annotateChildren: function() {
        var summaryItemFields = SummaryItem.getFields();
        _.forEach(this.get('Children'), function(child) {
            _.forEach(summaryItemFields, function(field) {
                child.set('SummaryItem_' + field.name, this.get(field.name));
            }, this);
            child.set('SummaryItem', this);
            var parent = child.get('Parent');
            if (parent) {
                child.set('Parent_FormattedId', parent.FormattedID);
                child.set('Parent_Name', parent.Name);
            }
            var owner = child.get('Owner');
            if (owner) {
                child.set('Owner_Name', owner._refObjectName);
            }
        }, this);
    }
});
