<?php
namespace ICARICCU\PEB\Models;

class Entity
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
    public $properties = [];

    /**
     * @var boolean
     */
    public $hidden = false;

    /**
     * @var boolean
     */
    public $isModified = false;
    
    /**
     * @var string
     */
    public $type = OntologyManagerTypeEnum::ENTITY;

    /**
     * @param AbstractProperty $property
     * @return void
     */
    public function addProperty($property)
    {
        $this->properties[] = $property;
    }

        /**
     * @param string $json
     * @return Ontology
     */
    public static function fromJson($json, $content = true)
    {
        $json = json_decode($json);

        $instance = new self();
        if($json)
        {
            foreach($json as $k=>$v) {
                if($k == 'content' && !$content)
                {
                    continue;
                }
                
                $instance->{$k} = $v;
            }
        }

        return $instance;
    }
}
