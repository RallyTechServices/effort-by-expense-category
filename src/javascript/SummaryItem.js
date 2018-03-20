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
        name: 'UserStory',
        type: 'auto'
    }, {
        name: 'UserStory_FormattedId',
        type: 'string',
        defaultValue: '--'
    }, {
        name: 'UserStory_Name',
        type: 'string',
        defaultValue: '--'
    }, {
        name: 'UserStory_AcceptedDate',
        type: 'string',
    }, {
        name: 'Parent',
        type: 'auto',
    }, {
        name: 'Parent_FormattedId',
        type: 'string'
    }, {
        name: 'Parent_Name',
        type: 'string'
    }, {
        name: 'Owner_Name',
        type: 'string'
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
        name: 'PortfolioItem/Deliverable_IsClosed',
        type: 'boolean'
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
        name: 'children',
        type: 'auto',
        defaultValue: []
    }],

    /**
     * Create a SummaryItem and loads parent PortfolioItem information in
     * the background. Any parent PI data that wasn't part of the group data
     * has a default value of 'Loading...' (above) and is either cleared when
     * we know there isn't a PI, or updated with the actual PI data in the
     * background.
     */
    createFromGroup: function(group) {
        var firstStory = group.children[0];
        var project = firstStory.get('Project');

        if (project) {
            this.set('Project', project);
            this.set('Project_Name', project.Name)
        }

        this.set('ExpenseCategory', firstStory.get('c_ExpenseCategory'));
        var groupPlanEstimate = _.reduce(group.children, function(accumulator, story) {
            return accumulator += story.get('PlanEstimate');
        }, 0);
        this.set('PlanEstimate', groupPlanEstimate);

        this.loadParentPis(firstStory)
            .then({
                scope: this,
                success: function() {
                    // Re-annotate the children after PI data loaded
                    this.updateChildren();
                    return this;
                }
            });

        this.addStoriesAsChildren(group.children);

        this.updateChildren(); // Copy summary info to each child
    },

    addStoriesAsChildren: function(stories) {
        // For each user story in the group, decorate them with NodeInterface
        // so they will render in the grid.
        var children = [];
        _.forEach(stories, function(story) {
            var childItem = new SummaryItem();
            var project = story.get('Project');
            if (project) {
                childItem.set('Project', project);
                childItem.set('Project_Name', project.Name)
            }
            childItem.set('UserStory', story);
            childItem.set('UserStory_FormattedId', story.get('FormattedID'));
            childItem.set('UserStory_Name', story.get('Name'));
            childItem.set('UserStory_AcceptedDate', story.get('AcceptedDate'));
            childItem.set('ExpenseCategory', story.get('c_ExpenseCategory'));
            childItem.set('PlanEstimate', story.get('PlanEstimate'));

            var parent = story.get('Parent');
            if (parent) {
                childItem.set('Parent', parent);
                childItem.set('Parent_FormattedId', parent.FormattedID);
                childItem.set('Parent_Name', parent.Name);
            }
            var owner = story.get('Owner');
            if (owner) {
                childItem.set('Owner_Name', owner._refObjectName);
            }

            //Ext.data.NodeInterface.decorate(child);
            childItem.set('leaf', true);
            children.push(childItem);
        }, this);
        this.set('children', children);
    },

    loadParentPis: function(firstItem) {
        var deferred = Ext.create('Deft.Deferred');

        var deliverable = firstItem.get('Deliverable');
        if (deliverable) {
            this.set('PortfolioItem/Deliverable', deliverable);
            this.set('PortfolioItem/Deliverable_FormattedId', deliverable.FormattedID);
            this.set('PortfolioItem/Deliverable_Name', deliverable.Name);
            if (deliverable.State) {
                this.set('PortfolioItem/Deliverable_IsClosed', deliverable.State.Name === 'Done');
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
    updateChildren: function() {
        // For some reason the tree grid REMOVES the children after it has processed them??
        var children = this.get('children') || this.childNodes;
        _.forEach(children, function(child) {
            child.set('Project', this.get('Project'));
            child.set('PortfolioItem/Deliverable', this.get('PortfolioItem/Deliverable'));
            child.set('PortfolioItem/Deliverable_FormattedId', this.get('PortfolioItem/Deliverable_FormattedId'));
            child.set('PortfolioItem/Deliverable_Name', this.get('PortfolioItem/Deliverable_Name'));
            child.set('PortfolioItem/Deliverable_IsClosed', this.get('PortfolioItem/Deliverable_IsClosed'));
            child.set('PortfolioItem/Project', this.get('PortfolioItem/Project'));
            child.set('PortfolioItem/Project_FormattedId', this.get('PortfolioItem/Project_FormattedId'));
            child.set('PortfolioItem/Project_Name', this.get('PortfolioItem/Project_Name'));
            child.set('PortfolioItem/Initiative', this.get('PortfolioItem/Initiative'));
            child.set('PortfolioItem/Initiative_FormattedId', this.get('PortfolioItem/Initiative_FormattedId'));
            child.set('PortfolioItem/Initiative_Name', this.get('PortfolioItem/Initiative_Name'));
        }, this);
    }
});
