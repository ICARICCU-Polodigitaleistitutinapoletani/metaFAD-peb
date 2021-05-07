<?php
namespace ICARICCU\PEB\Models;

class Ontology
{
    /**
     * @var PropertyId
     */
    public $id;
    /**
     * @var Label
     */
    public $name;
    /**
     * @var Date
     */
    public $lastModified = '';

    /**
     * @var array
     */
    public $items = [];

    /**
     * @var array
     */
    public $imported = [];

    /**
     * @var boolean
     */
    public $shared = false;

    /**
     * @var integer
     */
    public $entities = 0;

    /**
     * @var integer
     */
    public $terminology = 0;

    /**
     * @var array
     */
    public $derivedFrom = [];

    /**
     * @var string
     */
    public $ontologySite = '';


    /**
     * @var string
     */
    public $ontologyUrl = '';


    /**
     * @param PropertyId $id
     * @return void
     */
    public function __construct(PropertyId $id, $name)
    {
        $this->id = $id;
        $this->name = $name;
    }


        /**
     * @param [type] $property
     * @return void
     */
    public function addItem($item)
    {
        $this->items[] = $item;
    }

    /**
     * @param string $json
     * @return Ontology
     */
    public static function fromJson($json)
    {
        $json = json_decode($json);

        $instance = new self(new PropertyId($json->id), $json->name);
        foreach($json as $k=>$v) {
            if (in_array($k, ['id', 'name'])) continue;
            $instance->{$k} = $v;
        }

        return $instance;
    }
}