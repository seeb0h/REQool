'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Project = mongoose.model('Project'),
  User = mongoose.model('User'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  _ = require('lodash');

/**
 * Create a Project
 */
exports.create = function (req, res) {
  var project = new Project(req.body);
  project.user = req.user;

  project.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.jsonp(project);
    }
  });
};

/**
 * Show the current Project
 */
exports.read = function (req, res) {
  // convert mongoose document to JSON
  var project = req.project ? req.project.toJSON() : {};

  // Add a custom field to the Article, for determining if the current User is the "owner".
  // NOTE: This field is NOT persisted to the database, since it doesn't exist in the Article model.
  project.isCurrentUserOwner = req.user && project.user && project.user._id.toString() === req.user._id.toString();

  //Add active flag for user active project  
  if (req.user.activeProject) {
    project.active = (req.user.activeProject.toString() === project._id.toString());
  }

  res.jsonp(project);
};

/**
 * Update a Project
 */
exports.update = function (req, res) {
  var project = req.project;
  project = _.extend(project, req.body);

  project.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      if (req.project.active) {
        var user = req.user;

        if (user) {
          user.activeProject = project;
          user.save(function (err) {
            if (err) {
              return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
              });
            } else {
              res.jsonp(project);
            }
          });
        }
      } else {
        res.jsonp(project);
      }
    }
  });
};

/**
 * Delete an Project
 */
exports.delete = function (req, res) {
  var project = req.project;

  project.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.jsonp(project);
    }
  });
};

/**
 * List of Projects
 */
exports.list = function (req, res) {

  Project.find().lean().sort('-created').populate('user', 'displayName').exec(function (err, projects) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.jsonp(projects.map(function (p) {
        if (req.user && req.user.activeProject) {
          p.active = (req.user.activeProject.toString() === p._id.toString());
        } else {
          p.active = false;
        }

        return p;
      }));
    }
  });
};

/**
 * Project middleware
 */
exports.projectByID = function (req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Project is invalid'
    });
  }

  Project.findById(id).populate('user', 'displayName').exec(function (err, project) {
    if (err) {
      return next(err);
    } else if (!project) {
      return res.status(404).send({
        message: 'No Project with that identifier has been found'
      });
    }
    req.project = project;
    next();
  });
};
