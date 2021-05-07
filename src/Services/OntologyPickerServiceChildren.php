<?php
namespace ICARICCU\PEB\Services;

class OntologyPickerServiceChildren
{
    public function findTerm($fieldName, $model, $query, $term, $proxyParams)
    {
        $ontology =\__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('ontologyByIdOnly',['ontologyId' => $term])->first();
        
        $terms = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('terminologyForOntology', ['ontologyId' => $term]);

        if ($terms) {
            $children = [];
            foreach ($terms as $t) {
                $text = json_decode($t->ontology_name)->it;
                if (!$proxyParams || $proxyParams->text == '') {
                    $children[] = ['id' => $t->ontology_uri, 'text' => str_replace("'", "′",$text),'type' => json_decode($ontology->ontology_name)->it];
                } else if (stripos($text, $proxyParams->text) !== false) {
                    $children[] = ['id' => $t->ontology_uri, 'text' => str_replace("'", "′", $text),'type' => json_decode($ontology->ontology_name)->it];
                }
            }
        }

        return $children;
    }
}