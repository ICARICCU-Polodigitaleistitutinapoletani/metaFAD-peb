<?php
namespace ICARICCU\PEB\Controllers\Rest;


trait ControllerTrait
{
    use \pinax_mvc_core_AuthenticatedCommandTrait;

    /**
     * @return void
     */
    private function check()
    {
        // $this->checkPermissionForBackend();
    }

    /**
     * @return integer
     */
    private function userId()
    {
        return 1;
        return $this->user->id;
    }

    /**
     * @return integer
     */
    private function topOntologyUser()
    {
        return 0;
    }

    /**
     * @return string
     */
    private function language()
    {
        return 'it';
    }

    /**
     * @return ICARICCU\PEB\Models\OntologyManager
     */
    public function getIterator()
    {
        return \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
    }

    public function getProperties($ontologyId, $entityId, $returnSuperclasses = false, $addInherited = false)
    {
        if(!$ontologyId){
            return;
        }
        $it = $this->getIterator()
            ->load('propertiesForEntity', ['ontologyId' => $ontologyId, 'entitiesId' => [$entityId]]);
        foreach ($it as $ar) {
            $data = json_decode($ar->ontology_data);
            if ($data->type == 'superclass') {
                $superclasses[] = $data->value;
            }
            if($addInherited)
            {
                $data->inherited = true;
            }
            $this->properties[] = $data; /** @phpstan-ignore-line */
        }

        if (!empty($superclasses)) {
            if($returnSuperclasses)
            {
                return $superclasses;
            }
            foreach ($superclasses as $s) {
                if (!in_array($s, $this->resolveEntities)) { /** @phpstan-ignore-line */
                    $this->getProperties($ontologyId, $s);
                    $this->resolveEntities[] = $s; /** @phpstan-ignore-line */
                }
            }
        }
    }

    public function getSuperclassesProperties($data, $topEntity = false)
    {
        if($topEntity)
        {
            $superclassId = $data->topEntity->value;
        }
        else
        {
            $superclassId = $data->superclass->value;
        }
        $superclass = $this->getIterator()->load('entityByOnlyId',['entityId' => $superclassId])
                        ->first();
        $this->getProperties($superclass->ontology_parentUri, $superclassId, false, !$topEntity);
        $superclassData = json_decode($superclass->ontology_data);

        if($superclassData->copiedProperties)
        {
            foreach($superclassData->copiedProperties as $cp)
            {
                $copiedProperty = $this->getIterator()->where('ontology_uri', $cp)->first();
                $copiedPropertyData = json_decode($copiedProperty->ontology_data);
                if(!$copiedPropertyData->copied)
                {
                    $copiedPropertyData->copied = true;
                }
                $copiedPropertyData->inherited = true;
                $this->properties[] = $copiedPropertyData; /** @phpstan-ignore-line */
            }
        }

        if($superclassData->superclass)
        {
            $this->getSuperclassesProperties($superclassData);
        }
    }
}
