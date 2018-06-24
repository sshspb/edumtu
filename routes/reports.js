var express = require('express');
var router = express.Router();

var contract_controller = require('../controllers/contractController');
var department_controller = require('../controllers/departmentController');
var steward_controller = require('../controllers/stewardController');
var option_controller = require('../controllers/optionController');

router.get('/contract/:contract', contract_controller.contract_estimate_list);
router.get('/incomes/contract/:contract', contract_controller.contract_income_list);
router.get('/outlays/contract/:contract', contract_controller.contract_outlay_list);
router.get('/outlays/contract/:contract/ecode/:ecode', contract_controller.contract_ecode_outlay_list);
router.get('/departments_contracts', department_controller.department_contract_list);
router.get('/department/:department', department_controller.department_estimate_list);
router.get('/incomes/department/:department', department_controller.department_income_list);
router.get('/outlays/department/:department', department_controller.department_outlay_list);
router.get('/outlays/department/:department/ecode/:ecode', department_controller.department_ecode_outlay_list);
router.get('/stewards_contracts', steward_controller.steward_contract_list);
router.get('/steward/:steward', steward_controller.steward_estimate_list);
router.get('/incomes/steward/:steward', steward_controller.steward_income_list);
router.get('/outlays/steward/:steward', steward_controller.steward_outlay_list);
router.get('/outlays/steward/:steward/ecode/:ecode', steward_controller.steward_ecode_outlay_list);
router.get('/option/variant/:id', option_controller.set_variant);
router.get('/option/source/:id', option_controller.set_source);

module.exports = router;
