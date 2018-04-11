var express = require('express');
var router = express.Router();

var contract_controller = require('../controllers/contractController');
var department_controller = require('../controllers/departmentController');
var eclass_controller = require('../controllers/eclassController');
var outlay_controller = require('../controllers/outlayController');
var steward_controller = require('../controllers/stewardController');
var option_controller = require('../controllers/optionController');

router.get('/contract/:id', contract_controller.contract_detail);
router.get('/departments_contracts', department_controller.department_contract_list);
router.get('/department/:id', department_controller.department_detail);
router.get('/eclasses', eclass_controller.eclass_list);
router.get('/eclass/:id', eclass_controller.eclass_detail);
router.get('/outlays/:contract/:eclass', outlay_controller.outlay_list);
router.get('/stewards_contracts', steward_controller.steward_contract_list);
router.get('/steward/:id', steward_controller.steward_detail);
router.get('/option/variant/:id', option_controller.set_variant);
router.get('/option/scope/:id', option_controller.set_scope);

module.exports = router;
