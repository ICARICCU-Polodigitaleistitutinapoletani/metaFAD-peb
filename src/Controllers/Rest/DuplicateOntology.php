<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Models\Ontology;
use ICARICCU\PEB\Models\PropertyId;
use ICARICCU\PEB\Models\Label;
use ICARICCU\PEB\Services\ReadStorageService;
use Ramsey\Uuid\Uuid;

class DuplicateOntology extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $storageService;
    private $readStorageService;
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->storageService = new StorageService();
        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId)
    {
        $this->check();

        $ontologyId = rawurldecode(rawurldecode($ontologyId));
        $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());

        $postBody = json_decode(\__Request::getBody());
        $ontology->name = $postBody->name;

        $ontologyDetail = $this->readStorageService->compileOntologyDetailForDuplicate($ontology, true);

        $uuid = Uuid::uuid4();
        $ontology->id = $uuid->toString();

        try {
            $this->storageService->storeOntology($ontologyDetail, $this->userId());  
            return $ontology;
        } catch (\Exception $e) {
            return ['http-status' => 500];
        }
    }
}
