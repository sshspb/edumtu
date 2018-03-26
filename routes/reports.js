var express = require('express');
var router = express.Router();

var contract_controller = require('../controllers/contractController');
var department_controller = require('../controllers/departmentController');
var eclass_controller = require('../controllers/eclassController');
var outlay_controller = require('../controllers/outlayController');
var steward_controller = require('../controllers/stewardController');

router.get('/contracts', contract_controller.contract_list);
router.get('/contract/:id', contract_controller.contract_detail);
router.get('/departments', department_controller.department_list);
router.get('/department/:id', department_controller.department_detail);
router.get('/eclasses', eclass_controller.eclass_list);
router.get('/outlays/:contract/:eclass', outlay_controller.outlay_list);
router.get('/stewards', steward_controller.steward_list);
router.get('/steward/:id', steward_controller.steward_detail);

module.exports = router;