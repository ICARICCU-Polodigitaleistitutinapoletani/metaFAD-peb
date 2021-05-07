<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetOntologiesPickerChildren extends \pinax_rest_core_CommandRest
{
    public function execute($term, $proxyParams = null)
    {
        if($proxyParams){
            $proxyParams = json_decode($proxyParams);
        }
        $ontologyPickerService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\OntologyPickerServiceChildren');
        echo json_encode($ontologyPickerService->findTerm($term, $proxyParams));
        exit;
    }
}