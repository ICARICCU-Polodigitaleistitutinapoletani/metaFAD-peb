<?php
namespace ICARICCU\PEB\Services;

use ICARICCU\PEB\Models\OntologyManagerTypeEnum;

class OntologyPickerService
{
    public function findTerm($fieldName, $model, $query, $term, $proxyParams)
    {   
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\ContentsForm');

        if ($proxyParams) {
            if ($proxyParams->type) {
                $proxyParams->type = str_replace('@@','#', $proxyParams->type);
                $it = $it->where('__entityId', $proxyParams->type, 'ILIKE');
            }
        }

        if ($term) {
            $it = $it->where('title', '%' . $term . '%', 'ILIKE');
        }

        if($proxyParams && $it->count() == 0)
        {
            $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->where('ontology_type','terminology')
                    ->where('ontology_group',$proxyParams->type);
            if ($term) {
                $it = $it->where('ontology_name', '%' . $term . '%', 'ILIKE');
            }
            $fromOntologyTbl = true;
        }


        $result = [];
        foreach($it as $ar) {
            if(!$fromOntologyTbl)
            {
                $entityId = $ar->__entityId;

                if(!$entityId)
                {
                    continue;
                }
                $entity = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                        ->load('entityByUri',['entityUri'=>$entityId]);
                if($entity->first())
                {
                    $type = json_decode($entity->first()->ontology_name);
                    $type = $type->it;
                }
                else
                {
                    continue;
                }

                $result[] = [
                    'id' => $ar->id,
                    'text' => (string)$ar->title,
                    'type' => $type
                ];
                $count++;
                if($count > 100)
                {
                    break;
                }
            }
            else
            {
                $type = json_decode($ar->ontology_name);
                $type = $type->it;

                $result[] = [
                    'id' => $ar->ontology_uri,
                    'text' => json_decode($ar->ontology_name)->it,
                    'type' => 'Napoli Ontology peb'
                ];
                $count++;
                if ($count > 100) {
                    break;
                }
            }
        }

        usort($result, function($a, $b) {
            return strnatcasecmp($a['text'], $b['text']);
        });

        return $result;
    }
}
