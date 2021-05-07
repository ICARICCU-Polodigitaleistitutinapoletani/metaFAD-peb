<?php

namespace ICARICCU\PEB\Services\OwlTransformers;

use ICARICCU\PEB\Models\Entity;
use ICARICCU\PEB\Models\Label;
use ICARICCU\PEB\Models\OntologyManagerTypeEnum;
use ICARICCU\PEB\Models\Property;
use ICARICCU\PEB\Models\PropertyId;
use ICARICCU\PEB\Models\PropertyValue;
use ICARICCU\PEB\Models\PropertyValueRel;
use ICARICCU\PEB\Models\Relation;
use ICARICCU\PEB\Models\Superclass;
use ICARICCU\PEB\Models\Terminology;
use Ramsey\Uuid\Uuid;

class ClassTransformer implements Transformer
{
    private $ontologyId;
    private $ontologyName;
    private $entitiesReference = [];
    private $readStorageService;
    private $mappedIndividual = [];
    private $noRangeDomainProperties = [];
    private $thingUri = 'http://www.w3.org/2002/07/owl#Thing';
    private $possibleLabels;

    public function __construct($ontologyId, $ontologyName)
    {
        $this->ontologyId = $ontologyId;
        $this->ontologyName = $ontologyName;
        $this->readStorageService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\ReadStorageService');
    }

    public function transform($node, $xpath, $namespaces, $properties = null, $ontologyUri)
    {
        $entity = new Entity;
        $createdProperty = [];

        //Entità, info principali
        $entity->uri = $node->getAttribute('rdf:about');

        //Verifica conformità URI rispetto a quello dell'ontologia
        if (strpos($entity->uri, $ontologyUri) !== 0) {
            //In questo caso l'URI non è conforme con l'ontologia quindi deve essere
            //importata nella top ed impostata per il riuso in questa ontologia
            // $entity->topDomain = true;
        }

        if ($this->entitiesReference[$entity->uri]['old']) {
            return;
        }

        $entity->id = $this->entitiesReference[$entity->uri]['id'];

        $entity->name = $this->label(($xpath->query("rdfs:label", $node)) ?: $node->getAttribute('rdf:about'),
            $xpath->query("//rdf:Description[@rdf:about='" . $entity->uri . "']/rdfs:label"),
            $node->getAttribute('rdf:about')
        );

        $entity->labels = $this->getInfoFromTag($node, $xpath, 'rdfs:label');

        $entity->descriptions = $this->getInfoFromTag($node, $xpath, 'rdfs:description');

        $this->getSuperclass($node, $xpath, $entity);

        //Lettura onProperty
        $order = 1;
        //$this->getonProperty($xpath, $node, $createdProperty, $entity, $order);

        //Lettura relazioni
        $this->getObjectProperty($xpath, $node, $createdProperty, $entity, $order);

        //Lettura proprietà
        $this->getDatatypeProperty($xpath, $node, $createdProperty, $entity, $order);

        //Lettura proprità comuni a tutte le entità
        $this->getAnnotationProperty($xpath, $node, $createdProperty, $entity, $order);

        if ($entity->properties) {
            $entity->properties = $this->cleanDuplicateProperties($entity->properties);
        }

        return $entity;
    }

    public function addPropertiesToOntologies($xpath)
    {
        //relazioni
        $objectProperties = $xpath->query("owl:ObjectProperty");

        $storageService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\StorageService');

        foreach ($objectProperties as $op) {
            $name = $this->cleanLabel($op->getAttribute('rdf:about'));

            $domains = $this->domains($op);

            foreach ($domains as $d) {
                $entity = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->load('entityByOnlyId', ['entityId' => $d])
                    ->first();
                $ontologyUri = $entity->ontology_parentUri;
                $ontology = $this->readStorageService->getOntology($ontologyUri, $entity->ontology_FK_user_id);
                $ontologyItems = $this->readStorageService->compileOntologyDetail($ontology)->items;
                foreach ($ontologyItems as $item) {
                    $range = $this->range($op, true, true);
                    if (!$range) {
                        $range = current($domains);
                        if (!$range) {
                            $range = $entity->id;
                        }
                    }

                    $entityNameRange = $this->range($op);
                    if (!$entityNameRange) {
                        $entityNameRange = $this->cleanLabel(current($domains));
                        if (!$entityNameRange) {
                            $entityNameRange = $this->cleanLabel(current($item->id));
                        }
                    }

                    $relation = new Relation(
                        new PropertyId($op->getAttribute('rdf:about') . '@' . $range),
                        new PropertyValueRel(
                            new PropertyId($ontologyUri),
                            ($ontology->name->it) ? current(explode(' ', $ontology->name->it)) : current(explode(' ', $ontology->name->it)),
                            new PropertyValue(new PropertyId($op->getAttribute('rdf:about')), $entityNameRange)
                        ),
                        $this->propertyLabel($op->getAttribute('rdf:about'), $xpath),
                        sizeof($item->properties)
                    );

                    $item->addProperty($relation);
                }
            }

            $ontology->items = $ontologyItems;
            $storageService->storeOntology($ontology, \__Session::get('userImport'));
        }

        return $entity;
    }

    public function addPropertiesToOntologiesLinking($xpath)
    {
        //relazioni
        $objectProperties = $xpath->query("owl:ObjectProperty");

        $storageService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\StorageService');

        foreach ($objectProperties as $op) {
            $name = $this->cleanLabel($op->getAttribute('rdf:about'));
            $domains = $this->domains($op);

            foreach ($domains as $d) {
                $entity = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->load('entityByOnlyId', ['entityId' => $d])
                    ->first();
                $ontologyUri = $entity->ontology_parentUri;
                $ontology = $this->readStorageService->getOntology($ontologyUri, $entity->ontology_FK_user_id);
                $ontologyItems = $this->readStorageService->compileOntologyDetail($ontology)->items;
                $ontologyItemsNew = [];
                foreach ($ontologyItems as $item) {
                    if ($item->id !== $d) {
                        $ontologyItemsNew[] = $item;
                        continue;
                    }
                    $range = $this->range($op, true, true);

                    $relation = new Relation(
                        new PropertyId($d . '@' . $op->getAttribute('rdf:about') . '@multipleRanges'),
                        new PropertyValueRel(
                            new PropertyId($ontologyUri),
                            ($ontology->name->it) ? current(explode(' ', $ontology->name->it)) : current(explode(' ', $ontology->name->it)),
                            new PropertyValue(new PropertyId('ontology'), 'Varie')
                        ),
                        $this->propertyLabel($op->getAttribute('rdf:about'), $xpath),
                        sizeof($item->properties) + 1
                    );
                    $relation->ranges = $range;
                    $relation->multivalue = true;
                    $item->addProperty($relation);
                    $ontologyItemsNew[] = $item;
                }
                $ontology->items = $ontologyItemsNew;
                $storageService->storeOntology($ontology, \__Session::get('userImport'));
            }
        }

        return $entity;
    }


    /**
     * @param \DOMElement $property
     * @param \DOMXPath $xpath
     * @return boolean
     */
    private function isInverseProperty($property, $xpath)
    {
        return false;
        $propertyTarget = $property->getAttribute('rdf:resource');
        $propertyTargetNode = $xpath->query("owl:ObjectProperty[@rdf:about='" . $propertyTarget . "']/owl:inverseOf");
        return $propertyTargetNode->length != 0;
    }

    /**
     * @param \DOMElement $property
     * @param \DOMXPath $xpath
     * @return boolean
     */
    private function isRelation($property, $xpath)
    {
        $propertyTarget = $property->getAttribute('rdf:resource');
        $propertyTargetNode = $xpath->query("*[@rdf:about='" . $propertyTarget . "']");
        return $propertyTargetNode->length && $propertyTargetNode->item(0)->nodeName == 'owl:Class';
    }


    /**
     * @param array $nodes
     * @param array $alternativeNodes
     * @return ICARICCU\PEB\Models\Label
     */
    private function label($nodes, $alternativeNodes = null, $altTitle = null)
    {

        if (!$nodes->length && $alternativeNodes->length) {
            $nodes = $alternativeNodes;
        }
        if (!$nodes->length && !$alternativeNodes->length) {
            $label = new Label();
            if ($altTitle) {
                $altTitle = end(explode('/', str_replace('#', '/', $altTitle)));
                $label->add('it', $altTitle);
                return $label;
            }
        }

        $label = new Label();
        $languages = [];
        foreach ($nodes as $node) {
            if ($node->getAttribute('xml:lang')) {
                $lang = $node->getAttribute('xml:lang');
                if($lang == 'ita'){
                    $lang == 'it';
                }
                $languages[$lang] = $node->nodeValue;
            }
        }

        foreach($languages as $k => $v){
            $label->add($k, $v);
        }

        if (!$languages['it']) {
            $label->add('it', $languages['en']?: $altTitle);
        }

        return $label;
    }

    private function simpleLabel($label, $node = null)
    {
        $l = new Label();
        $l->add('it', $label);
        return $l;
    }

    private function propertyLabel($uri, $xpath)
    {
        $title = $this->cleanLabel($uri);
        $labelNodes = $xpath->query("*[@rdf:about='" . str_replace("'", "&apos;", $uri) . "']/rdfs:label");
        return $this->label($labelNodes, null, $title);
    }

    private function cleanLabel($label, $mapping = null)
    {
        if (strpos($label, '#') !== false) {
            $cleanedLabel = end(explode('#', $label));
        } else {
            $cleanedLabel = end(explode('/', $label));
        }

        if ($mapping && !is_array($label)) {
            return $mapping[$label];
        } else {
            return $cleanedLabel;
        }
    }

    private function nextNodeSibling($node)
    {
        $tempNode = null;
        while (true) {
            $tempNode = $node->nextSibling;
            if ($tempNode == null || $tempNode->nodeType == XML_ELEMENT_NODE) {
                break;
            }

            $node = $tempNode;
        }

        return $tempNode;
    }

    private function fieldType($node)
    {
        $type = $node->hasAttribute('rdf:resource') ? $node->getAttribute('rdf:resource') : $node->getAttribute('rdf:datatype');
        return $type;
    }

    private function domains($node)
    {
        $type = [];
        $children = $node->childNodes;
        foreach ($children as $c) {
            if ($c->tagName == 'rdfs:domain') {
                if ($c->getAttribute('rdf:resource')) {
                    $type[] = $c->getAttribute('rdf:resource');
                } else {
                    $children2 = $c->childNodes;
                    foreach ($children2 as $c2) {
                        if ($c2->tagName == 'owl:Class') {
                            $children3 = $c2->childNodes;
                            foreach ($children3 as $c3) {
                                if ($c3->tagName == 'owl:unionOf') {
                                    $children4 = $c3->childNodes;
                                    foreach ($children4 as $c4) {
                                        if ($c4->tagName == 'rdf:Description') {
                                            $type[] = $c4->getAttribute('rdf:about');
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return $type;
    }

    private function range($node, $full = false, $multiple = false)
    {
        $type = '';
        $types = [];

        $children = $node->childNodes;
        foreach ($children as $c) {
            if ($c->tagName == 'rdfs:range') {
                $type = $c->getAttribute('rdf:resource');
                if (!$type) {
                    if ($c->childNodes) {
                        foreach ($c->childNodes as $cc) {
                            if ($cc->tagName == 'owl:Restriction') {
                                foreach ($cc->childNodes as $restriction) {
                                    if ($restriction->tagName == 'owl:someValuesFrom') {
                                        $type = $restriction->getAttribute('rdf:resource');
                                        $types[] = $type;
                                    }

                                    if ($restriction->tagName == 'owl:onClass') {
                                        $type = $restriction->getAttribute('rdf:resource');
                                        $types[] = $type;
                                    }
                                }
                            } else if ($cc->tagName) {
                                if ($cc->tagName == 'owl:Class') {
                                    $children3 = $cc->childNodes;
                                    foreach ($children3 as $c3) {
                                        if ($c3->tagName == 'owl:unionOf') {
                                            $children4 = $c3->childNodes;
                                            foreach ($children4 as $c4) {
                                                if ($c4->tagName == 'rdf:Description') {
                                                    $types[] = $c4->getAttribute('rdf:about');
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    $types[] = $type;
                }
            }
        }

        if ($multiple || sizeof($types) > 1) {
            return $types;
        }
        return ($full) ? $type : $this->cleanLabel($type);
    }

    private function isMultiple($node)
    {
        $type = '';

        $children = $node->childNodes;
        foreach ($children as $c) {
            if ($c->tagName == 'rdfs:range') {
                if ($c->childNodes) {
                    foreach ($c->childNodes as $cc) {
                        if ($cc->tagName == 'owl:Restriction') {
                            if ($cc->childNodes)
                                foreach ($cc->childNodes as $restriction) {
                                    if ($restriction->tagName == 'owl:qualifiedCardinality') {
                                        if ($restriction->textContent === '1') {
                                            return false;
                                        }
                                    }
                                }
                        }
                    }
                }
            }
        }
        return true;
    }

    private function getInverse($node)
    {
        $children = $node->childNodes;
        foreach ($children as $c) {
            if ($c->tagName == 'owl:inverseOf') {
                return $c->getAttribute('rdf:resource');
            }
        }
        return null;
    }

    private function formatName($name)
    {
        $n = new \StdClass();
        $n->it = $name;
        return $n;
    }

    private function typePropertyTranslate($type)
    {
        $types = [
            'string' => ["id" => "http://peb.icariccu.it/standard/fieldText", "type" => "Testo"],
            'float' => ["id" => "http://peb.icariccu.it/standard/fieldNumber", "type" => "Numerico"],
            'dateTimeStamp' => ["id" => "http://peb.icariccu.it/standard/fieldText", "type" => "Testo"],
            'dateTime' => ["id" => "http://peb.icariccu.it/standard/fieldText", "type" => "Testo"],
            'Literal' => ["id" => "http://peb.icariccu.it/standard/fieldText", "type" => "Testo"],
            'boolean' => ["id" => "http://peb.icariccu.it/standard/fieldNumber", "type" => "Numerico"],
            'wktliteral' => ["id" => "http://peb.icariccu.it/standard/fieldText", "type" => "Testo"]
        ];

        return ($types[$type]) ?: $types['string'];
    }

    public function createTerminology($storageService, $readStorageService, $item, $ontologyId, $userId, $derivedFrom = null, $mapping = null, $namespaces = null, $merging = false)
    {
        if ($mapping[''] === false) {
            $mapping = null;
        }

        if ($item->getAttribute('rdf:oldAbout')) {
            //Caso particolare per replace vecchi uri, si può eliminare a regime?
            $oldUri = $item->getAttribute('rdf:oldAbout');
            $term = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_real_uri', $oldUri)
                ->first();
            if ($term) {
                $term->ontology_real_uri = $item->getAttribute('rdf:about');
                $data = json_decode($term->ontology_data);
                $data->uri = $term->ontology_real_uri;
                $term->ontology_name = '{"it":"' . end(explode('/', $data->uri)) . '"}';
                $data->name = new \stdClass();
                $data->name->it = end(explode('/', $data->uri));
                $term->ontology_data = json_encode($data);
                $term->save();
            }
            return;
        }

        $niInfo = $this->extractNamedIndividualInfo($item, $namespaces);

        if ($mapping[$niInfo['about']['resource']]['old'] == true) {
            //Non devo sovrascrivere, l'import è incrementale
            return;
        }

        foreach ($niInfo as $infos) {
            foreach ($infos as $info) {
                if (is_array($info) && $info['ontology']) {
                    if (!in_array($info['ontology'], $derivedFrom)) {
                        $derivedFrom[] = $info['ontology'];
                    }
                }
            }
        }
        $name = new Label();
        if ($this->possibleLabels) {
            foreach ($this->possibleLabels as $l => $pl) {
                $name->add($l, $pl);
            }
        } else {
            $name->add('it', $niInfo['about']['value']);
            $name->add('en', $niInfo['about']['value']);
        }

        $newTerm = new Terminology();
        $newTerm->name = $name;

        $newTerm->id = $mapping[$niInfo['about']['resource']]['id'];
        $newTerm->uri = $niInfo['about']['resource'];

        $newTerm->complete = true;

        //elaborazione dati per scheda contenuto
        $typeNiInfo = $niInfo['type'];

        if ($typeNiInfo) {
            $entityId = $this->entitiesReference[current($typeNiInfo)['resource']]['id'];
            if (!$entityId) {
                $e = $this->readStorageService->getEntityByUri(current($typeNiInfo)['resource']);
                if ($e) {
                    $entityId =  $e->ontology_uri;
                    $this->entitiesReference[$e->ontology_real_uri] = ['id' => $e->ontology_uri, 'value' => json_decode($e->ontology_name)->it];
                }
            }
            $entityProp = $this->readStorageService->getPropertiesForEntities($ontologyId, $entityId);
        } else {
            $entityProp = $this->readStorageService->getPropertiesForEntities(($derivedFrom) ?: $ontologyId, null);
        }

        $content = [];

        if ($entityProp) {
            foreach ($entityProp as $ep) {
                if (strpos($ep->uri, '#')) {
                    $tagName = end(explode('#', $ep->uri));
                } else {
                    $tagName = end(explode('/', $ep->uri));
                }

                $ep->items = [];

                $values = null;

                if ($niInfo[$tagName]) {
                    $values = $niInfo[$tagName];
                } else {
                    $ep->items[] = ['value' => null];
                    $values = null;
                }

                if ($values) {
                    if (sizeof($values) < 2) {
                        if ($ep->multivalue) {
                            $ep->items[] = ['id' => $ep->id, 'value' => (current($values)['value']) ?: [$this->cleanLabel(current($values)['resource'], $mapping)]];
                        } else {
                            $ep->items[] = ['id' => $ep->id, 'value' => (current($values)['value']) ?: $this->cleanLabel(current($values)['resource'], $mapping)];
                        }
                    } else {
                        $toSave = [];
                        foreach ($values as $v) {
                            $toSave[] = ($v['value']) ?: $this->cleanLabel($v['resource'], $mapping);
                        }
                        if ($ep->type == 'property') {
                            foreach ($toSave as $s) {
                                $obj = new \stdClass();
                                $obj->value = $s;
                                $ep->items[] = $obj;
                            }
                        } else {
                            $ep->items[] = ['id' => $ep->id, 'value' => $toSave];
                        }
                    }
                }
                $content[] = $ep;
            }
        }

        $newTerm->content = $content;

        if ($merging) {
            $newTerm->id = \__Session::get('mergeOntoId') . '/' . Uuid::uuid4();
        }

        if ($typeNiInfo) {
            $storageService->storeEntity($newTerm, $ontologyId, $userId, $this->entitiesReference[current($typeNiInfo)['resource']]['id'], OntologyManagerTypeEnum::TERMINOLOGY);
        } else {
            $storageService->storeEntity($newTerm, $ontologyId, $userId, null, OntologyManagerTypeEnum::TERMINOLOGY);
        }
    }

    public function extractNamedIndividualInfo($data, $namespaces = null)
    {
        $ni = [];
        $ni['about'] = ['resource' => $data->getAttribute('rdf:about'), 'value' => $this->cleanLabel($data->getAttribute('rdf:about'))];
        $this->possibleLabels = [];

        $children = $data->childNodes;
        foreach ($children as $c) {
            if ($c->tagName) {
                $tagName = end(explode(':', $c->tagName));
                $ns = current(explode(':', $c->tagName));
                $resource = $c->getAttribute('rdf:resource');
                if (!$resource) {
                    if (array_key_exists($ns, $namespaces)) {
                        $resource = $namespaces[$ns] . '#' . $tagName;
                    }
                }
                $value = $c->textContent;
                if (\DateTime::createFromFormat('d/m/Y', $value) !== FALSE) {
                    $date = \DateTime::createFromFormat('d/m/Y', $value);
                    $value = date_format($date, 'Y-m-d');
                }
                if ($c->getAttribute('xml:lang') && $tagName == 'label') {
                    $this->possibleLabels[$c->getAttribute('xml:lang')] = $value;
                }
                $ni[$tagName][] = ['resource' => $resource, 'value' => $value];
            }
        }

        if ($ni['labels']) {
            $ni['about']['value'] = current($ni['labels'])['value'];
        }
        if ($ni['label']) {
            $ni['about']['value'] = current($ni['label'])['value'];
        }

        return $ni;
    }

    public function mapNamedIndividual($node, $xpath)
    {
        $uri = $node->getAttribute('rdf:about');
        $oldInstance = $this->readStorageService->getInstancesByUri($uri);
        if ($oldInstance) {
            $id =  $oldInstance->ontology_uri;
        } else {
            $id = $this->ontologyId . '#' . Uuid::uuid4()->toString();
        }

        $labels = $this->getInfoFromTag($node, $xpath, 'rdfs:label');
        foreach ($labels as $label) {
            if ($label->lang == 'ita' || $label->lang == 'it') {
                $labelForIndividual = $label->name;
                break;
            }
        }
        if (!$labelForIndividual) {
            $labelForIndividual = end(explode('/', $uri));
        }
        $this->mappedIndividual[$uri] = ['id' => $id, 'value' => ($labelForIndividual) ? $labelForIndividual : current($labels)->name, 'old' => ($oldInstance) ? true : false];
    }

    public function getExistingIndividual($ontologyId)
    {
        $instances = $this->readStorageService->getOnlyInstancesForOntology($ontologyId, '', 1, 0);
        foreach ($instances as $i) {
            if (!array_key_exists($i->uri, $this->mappedIndividual)) {
                $this->mappedIndividual[$i->uri] = ['id' => $i->id, 'value' => $i->name->it];
            }
        }
    }

    public function cleanDuplicateProperties($properties)
    {
        $propertyIds = [];
        $propertiesClean = [];
        foreach ($properties as $p) {
            $propertyId = $p->id->__get('id');
            if (!in_array($propertyId, $propertyIds)) {
                array_push($propertyIds, $propertyId);
                array_push($propertiesClean, $p);
            }
        }
        return $propertiesClean;
    }

    public function getonProperty($xpath, $node, &$createdProperty, &$entity, &$order)
    {
        $properties = $xpath->query(".//owl:onProperty", $node);
        foreach ($properties as $property) {
            if ($this->isInverseProperty($property, $xpath)) continue;

            $resource = $property->getAttribute('rdf:resource');
            $propertyNameForId = explode('#', $resource);
            if (sizeof($propertyNameForId) == 1) {
                $propertyNameForId = end(explode('/', $resource));
            }

            $name = $this->propertyLabel($property->getAttribute('rdf:resource'), $xpath);
            $propertyName = $this->cleanLabel($property->getAttribute('rdf:resource'));

            if (in_array($propertyName, $createdProperty)) {
                continue;
            }

            $propertyTypeNode = $this->nextNodeSibling($property);
            if (!$propertyTypeNode) continue;

            $fieldType = $this->fieldType($propertyTypeNode);
            if (!$fieldType) continue;



            if (!$this->isRelation($propertyTypeNode, $xpath)) {
                $item = new Property(
                    new PropertyId($fieldType . '@' . $entity->id . '@' . $propertyNameForId),
                    new PropertyValue(new PropertyId('http://peb.icariccu.it/standard/fieldText'), "Testo"),
                    $name,
                    $order++
                );
                $createdProperty[] = $name->get('it');
                $entity->addProperty($item);
            }
        }
    }

    public function getObjectProperty($xpath, $node, &$createdProperty, &$entity, &$order)
    {
        $objectProperties = $xpath->query(".//owl:ObjectProperty", $node->parentNode);
        foreach ($objectProperties as $op) {
            $range = null;
            $domain = null;
            $name = null;
            $labels = $xpath->query("rdfs:label", $op);
            if ($labels) {
                foreach ($labels as $label) {
                    $name = $label->nodeValue;
                    break;
                }
            }

            if (!$name) {
                $name = $this->cleanLabel($op->getAttribute('rdf:about'));
            }
            $propertyLabel = $this->propertyLabel($op->getAttribute('rdf:about'), $xpath);

            if (in_array($propertyLabel->get('it'), $createdProperty)) {
                continue;
            }

            $domains = $this->domains($op);

            $createOP = (empty($domains) || in_array($entity->uri, $domains)) ? true : false;

            if ($domains[0] == $this->thingUri) {
                $restrictionsListForEntity = [];
                $restrictions = $xpath->query("rdfs:subClassOf/owl:Restriction", $node);
                if ($restrictions) {
                    foreach ($restrictions as $restriction) {
                        $onProperty = null;
                        $fromEntity = null;
                        if ($restriction->childNodes) {
                            foreach ($restriction->childNodes as $cn) {
                                if ($cn->tagName == 'owl:onProperty') {
                                    $onProperty = $cn->getAttribute('rdf:resource');
                                }
                                if ($cn->tagName == 'owl:someValuesFrom' || $cn->tagName == 'owl:someValuesFrom') {
                                    $fromEntity = $cn->getAttribute('rdf:resource');
                                }
                            }
                            if ($onProperty && $fromEntity) {
                                $restrictionsListForEntity[$onProperty] = ['entity' => $fromEntity];
                                $onProperty = null;
                                $fromEntity = null;
                            }
                        }
                    }
                }

                if (array_key_exists($op->getAttribute('rdf:about'), $restrictionsListForEntity)) {
                    $domains = [$entity->uri];
                    $range = [$restrictionsListForEntity[$op->getAttribute('rdf:about')]['entity']];
                    $createOP = true;
                }
            }
            if (!$domains) {
                $sub = $xpath->query("rdfs:subPropertyOf", $op);
                if ($sub) {
                    foreach ($sub as $s) {
                        $uriSuperProperty = $s->getAttribute('rdf:resource');
                        $objs = $xpath->query(".//owl:ObjectProperty", $node->parentNode);
                        foreach ($objs as $obj) {
                            if ($obj->getAttribute('rdf:about') == $uriSuperProperty) {
                                $domains = $this->domains($obj);
                                $createOP = (empty($domains) || in_array($entity->uri, $domains)) ? true : false;
                                break;
                            }
                        }
                    }
                }
            }

            if ($createOP) {
                $range = ($range) ?: $this->range($op, true);

                $entityNameRange = $this->range($op);
                if (!$entityNameRange) {
                    $entityNameRange = $this->cleanLabel(current($domains));
                    if (!$entityNameRange) {
                        if (is_array($entity->id)) {
                            $entityNameRange = $this->cleanLabel(current($entity->id));
                        }
                    }
                }

                $l = new Label();
                $l->add('it', $name);

                $uuid = $this->checkPropertyByUri($op->getAttribute('rdf:about'));

                $item = new Relation(
                    new PropertyId($uuid),
                    new PropertyValueRel(
                        new PropertyId($this->ontologyId),
                        ($this->ontologyName->it) ? current(explode(' ', $this->ontologyName->it)) : current(explode(' ', $this->ontologyName->get('it'))),
                        new PropertyValue(new PropertyId($op->getAttribute('rdf:about')), (!is_string($range)) ? 'Varie' : $entityNameRange)
                    ),
                    $l,
                    $order++
                );

                $item->labels = $this->getInfoFromTag($op, $xpath, 'rdfs:label');
                $item->multivalue = $this->isMultiple($op);
                $item->uri = $op->getAttribute('rdf:about');

                if (is_string($range)) {
                    $range = [$range];
                }
                if ($range) {
                    $item->codomain = [];
                    foreach ($range as $r) {
                        $cc = $this->entitiesReference[$r];
                        if ($cc) {
                            $item->codomain[] = $cc;
                        }
                    }
                }

                $item->inverseOf = $this->entitiesReference[$this->getInverse($op)];
                if ($domains) {
                    $item->domain = [];
                    foreach ($domains as $domain) {
                        $dd = $this->entitiesReference[$domain];
                        if ($dd) {
                            $item->domain[] = $dd;
                        }
                    }
                }

                if (empty($domains) && current($range) == '') {
                    //Casistica di proprietà che non ha definito domain e range
                    $this->noRangeDomainProperties[] = $item;
                    continue;
                }

                $entity->addProperty($item);
                $createdProperty[] = $name;
            }
        }
    }
    public function getDatatypeProperty($xpath, $node, &$createdProperty, &$entity, &$order)
    {
        $datatypeProperties = $xpath->query(".//owl:DatatypeProperty", $node->parentNode);

        foreach ($datatypeProperties as $dp) {
            $domains = $this->domains($dp);
            $createDP = (empty($domains) || in_array($entity->uri, $domains)) ? true : false;

            if ($createDP) {
                $name = $this->cleanLabel($dp->getAttribute('rdf:about'));

                $propertyLabel = $this->propertyLabel($dp->getAttribute('rdf:about'), $xpath);

                if (in_array($propertyLabel->get('it'), $createdProperty)) {
                    continue;
                }

                $fieldType = $this->range($dp);
                $propType = $this->typePropertyTranslate($fieldType);

                $uuid = $this->checkPropertyByUri($dp->getAttribute('rdf:about'));

                $item = new Property(
                    new PropertyId($uuid),
                    new PropertyValue(new PropertyId($propType['id']), $propType['type']),
                    $this->propertyLabel($dp->getAttribute('rdf:about'), $xpath),
                    $order++
                );
                $item->uri = $dp->getAttribute('rdf:about');

                $entity->addProperty($item);
            }
        }
    }
    public function getAnnotationProperty($xpath, $node, &$createdProperty, &$entity, &$order)
    {
        $annotationProperties = $xpath->query(".//owl:AnnotationProperty", $node->parentNode);
        foreach ($annotationProperties as $ap) {
            $name = $this->cleanLabel($ap->getAttribute('rdf:about'));

            $domains = $this->domains($ap);

            $createAP = (empty($domains) || in_array($entity->uri, $domains)) ? true : false;

            if ($createAP) {
                $fieldType = $this->range($ap);
                $propType = $this->typePropertyTranslate($fieldType);

                $uuid = $this->checkPropertyByUri($ap->getAttribute('rdf:about'));

                $item = new Property(
                    new PropertyId($uuid),
                    new PropertyValue(new PropertyId($propType['id']), $propType['type']),
                    $this->propertyLabel($ap->getAttribute('rdf:about'), $xpath),
                    $order++
                );

                $item->uri = $ap->getAttribute('rdf:about');

                $item->isAnnotationProperty = true;

                $entity->addProperty($item);
            }
        }
    }

    public function getInfoFromTag($node, $xpath, $tagName)
    {
        $result = [];
        $order = 1;
        $labels = $xpath->query($tagName, $node);
        if ($labels) {
            foreach ($labels as $label) {
                $obj = new \stdClass();
                $obj->order = $order;
                $order++;
                $obj->name = $label->nodeValue;
                $obj->lang = ($label->getAttribute('xml:lang') == 'it') ? 'ita' : $label->getAttribute('xml:lang');
                $result[] = $obj;
            }
        }

        return $result;
    }

    public function checkPropertyByUri($propertyUri)
    {
        $property = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('propertyByUri', ['propertyUri' => $propertyUri])
            ->first();
        if ($property) {
            return $property->ontology_uri;
        } else {
            return $this->ontologyId . '#' . Uuid::uuid4()->toString();
        }
    }

    public function prepareEntities($node, $xpath)
    {
        $uri = $node->getAttribute('rdf:about');
        $oldEntity = $this->readStorageService->getEntityByUri($uri);
        if ($oldEntity) {
            $id =  $oldEntity->ontology_uri;
        } else {
            $id = $this->ontologyId . '#' . Uuid::uuid4()->toString();
        }
        $name = $this->label(($xpath->query("rdfs:label", $node)) ?: $node->getAttribute('rdf:about'),
            $xpath->query("//rdf:Description[@rdf:about='" . $uri . "']/rdfs:label"),
            $node->getAttribute('rdf:about')
        );

        $this->entitiesReference[$uri] = ['id' => $id, 'value' => $name->get('it'), 'old' => ($oldEntity) ? true : false];
    }

    public function getMappedIndividual()
    {
        return $this->mappedIndividual;
    }

    public function getSuperclass($node, $xpath, &$entity)
    {
        //Definizione superclass
        $superclasses = $xpath->query("rdfs:subClassOf/@rdf:resource", $node);
        if ($superclasses) {
            foreach ($superclasses as $superclass) {
                $superclassObj = new \stdClass();
                $superclassObj->value = $this->entitiesReference[$superclass->value]['id'];
                if (!$superclassObj->value) {
                    continue;
                }
                $entity->superclass = $superclassObj;
                break;
            }
        }
    }

    public function setEntityReference($uri, $id)
    {
        $this->entitiesReference[$uri]['id'] = $id;
    }
}
