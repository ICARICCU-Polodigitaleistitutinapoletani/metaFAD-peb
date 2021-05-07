<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Services\StorageService;
use Ramsey\Uuid\Uuid;

class PostOntologyShare extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    private $storageService;

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
    public function execute($ontologyId)
    {
        $this->check();

        try {
            $ontologyId = rawurldecode(rawurldecode($ontologyId));
            $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());
        } catch (\Exception $e) {
            return ['http-status' => 404];
        }

        $ontology->shared = \__Request::getBody() == 'true';

        $ar = \__ObjectFactory::createModelIterator('peb.OntologyRegistry.Models.Model')
                ->where('onto_id',md5($ontologyId))
                ->first();

        if ($ontology->shared) {
            if (!$ar) {
                $ar = \__ObjectFactory::createModel('peb.OntologyRegistry.Models.Model');
                $ar->onto_id = md5($ontologyId);
                $ar->onto_creationDate = new \pinax_types_DateTime();
                $new = true;
            }

            $onto_data = new \stdClass();
            $onto_data->uri = $ontologyId;
            $ar->onto_data = json_encode($onto_data);

            $ar->onto_title = $ontology->name->it;
            $ar->onto_modificationDate = new \pinax_types_DateTime();

            if ($new) {
                $ar->save(null, true);
            } else {
                $ar->save();
            }
        }
        else
        {
            if ($ar) {
                $ar->delete();
            }
        }

        $this->storageService->storeOntology($ontology, $this->userId());
        return ['http-status' => 200];
    }
}