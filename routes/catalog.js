// file ./routes/catalog.js

var express = require('express');
var router = express.Router();

var contract_controller = require('../controllers/contractController');
var department_controller = require('../controllers/departmentController');
var estimate_controller = require('../controllers/estimateController');
var source_controller = require('../controllers/sourceController');
var steward_controller = require('../controllers/stewardController');
var outlay_controller = require('../controllers/outlayController');
var eclass_controller = require('../controllers/eclassController');
var species_controller = require('../controllers/speciesController');

router.get('/departments', department_controller.department_list);
router.get('/contracts', contract_controller.contract_list);
router.get('/estimates', estimate_controller.estimate_list);
router.get('/sources', source_controller.source_list);
router.get('/stewards', steward_controller.steward_list);
router.get('/eclasses', eclass_controller.eclass_list);
router.get('/species', species_controller.species_list);
router.get('/outlays/:contract/:eclass', outlay_controller.outlay_list);

router.get('/contract/:id', contract_controller.contract_detail);
router.get('/department/:id', department_controller.department_detail);
router.get('/steward/:id', steward_controller.steward_detail);
router.get('/source/:id', source_controller.source_detail);

module.exports = router;