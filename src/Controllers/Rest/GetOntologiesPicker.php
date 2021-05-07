<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetOntologiesPicker extends \pinax_rest_core_CommandRest
{
    public function execute($term)
    {
        $ontologyPickerService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\OntologyPickerServiceComplete');
        return $ontologyPickerService->findTerm($term);
    }
}