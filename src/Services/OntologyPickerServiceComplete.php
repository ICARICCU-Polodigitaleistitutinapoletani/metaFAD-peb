<?php
namespace ICARICCU\PEB\Services;

class OntologyPickerServiceComplete
{
    public function findTerm($fieldName, $model, $query, $term, $proxyParams)
    {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('ontologies',['userId' => 1]);

        if($term)
        {
            $it = $it->where('ontology_name','%'.$term.'%','ILIKE');
        }
        $readStorageService = new ReadStorageService();

        $result = [];
        foreach($it as $ar) {
            $instances = $readStorageService->getOnlyInstancesForOntology($ar->ontology_uri, '', 1, 0);
            if(sizeof($instances) > 0)
            {
                $result[] = [
                    'id' => $ar->ontology_uri,
                    'text' => json_decode($ar->ontology_name)->it
                ];
            }
        }

        usort($result, function($a, $b) {
            return strnatcasecmp($a['text'], $b['text']);
        });

        return $result;
    }
}
