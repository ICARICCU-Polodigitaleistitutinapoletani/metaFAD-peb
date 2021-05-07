<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class CanEditProperty extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($propertyId)
    {
        $propertyId = urldecode(urldecode($propertyId));
        $property = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->where('ontology_uri', $propertyId)
                    ->first();
        $data = json_decode($property->ontology_data);
        $result = new \stdClass();
        if($data->domain)
        {
            foreach($data->domain as $d)
            {
                $entity = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                        ->where('ontology_uri', $d->id)
                        ->first();
                if($this->countInstances($d->id, $entity->ontology_group) > 0)
                {
                    $result->canEdit = false;
                    echo json_encode($result);
                    exit;
                }
            }
        }
        else if($data->type == 'property')
        {
            $entity = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                        ->where('ontology_uri', $property->ontology_parentUri)
                        ->first();
            if($this->countInstances($property->ontology_parentUri, $entity->ontology_group) > 0)
            {
                $result->canEdit = false;
                echo json_encode($result);
                exit;
            }
        }
        else if($data->type == 'relation')
        {
            //Caso in cui la relazione non ha un dominio
            $entities = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                        ->where('ontology_type', 'entity');
            foreach($entities as $entity)
            {
                if($this->countInstances($entity->ontology_uri, $entity->ontology_group) > 0)
                {
                    $result->canEdit = false;
                    echo json_encode($result);
                    exit;
                }
            }
        }

        $result->canEdit = true;
        echo json_encode($result);
        exit;
    }
    
    private function countInstances($domainId, $ontologyId)
    {
        return $this->getIterator()
            ->load('terminologyBySuperclass', [
                        'ontologyId' => $ontologyId,
                        'superclass' => $domainId,
                        'search' => '',
                        'page' => 1,
                        'limit' => 0
                    ])->count();
    }
}
