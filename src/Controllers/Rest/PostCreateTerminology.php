<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Models\Entity;
use ICARICCU\PEB\Models\Label;
use ICARICCU\PEB\Models\Superclass;
use ICARICCU\PEB\Models\Terminology;
use ICARICCU\PEB\Models\Content;
use ICARICCU\PEB\Models\PropertyId;
use ICARICCU\PEB\Models\PropertyValue;
use ICARICCU\PEB\Models\OntologyManagerTypeEnum;

class PostCreateTerminology extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $storageService;
    private $readStorageService;

    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
        $this->storageService = new StorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId, $entity, $terms)
    {
        $this->check();

        try {
            $ontologyId = rawurldecode(rawurldecode($ontologyId));
            $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());  
        } catch (\Exception $e) {
            return ['http-status' => 404];
        }

        if($entity)
        {
            try {
                $entityId = (!$entity->id) ? $this->addEntity($ontologyId, $entity) : $entity->id;            
            } catch (\Exception $e) {
                return ['http-status' => 500];
            }
        }

        $termsToAdd = $this->splitTerms($terms->value); 
        foreach($termsToAdd as $term) {
            $name = new Label();
            $name->add($this->language(), $term);

            $newTerm = new Terminology();
            $newTerm->name = $name;
            $this->storageService->storeEntity($newTerm, $ontologyId, $this->userId(), $entityId, OntologyManagerTypeEnum::TERMINOLOGY);
        }

        $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());
        return $this->readStorageService->compileOntologyDetail($ontology);  
    }

    /**
     * @param string $ontologyId
     * @param StdClass $entity
     * @return string
     */
    private function addEntity($ontologyId, $entity)
    {
        $name = new Label();
        $name->add($this->language(), $entity->value);
        $newEntity = new Entity();
        $newEntity->name = $name;

        $this->storageService->storeEntity($newEntity, $ontologyId, $this->userId());
        return (string)$newEntity->id;
    }

    /**
     * @param string $values
     * @return array
     */
    private function splitTerms($values)
    {
        return array_filter(explode(PHP_EOL, $values), function($item){
            return !empty(trim($item));
        });
    }
}