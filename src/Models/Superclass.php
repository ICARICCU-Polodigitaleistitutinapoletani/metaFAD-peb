<?php
namespace ICARICCU\PEB\Models;

class Superclass
{
    /**
     * @var PropertyId
     */
    public $id;
    /**
     * @var string
     */
    public $type = 'superclass';
    /**
     * @var ICARICCU\PEB\Models\PropertyValue
     */
    public $value;

    /**
     * @var Label
     */
    public $name;
    
    /**
     * @param PropertyId $id
     * @param PropertyValue $value
     * @return void
     */
    public function __construct(PropertyId $id, $value, Label $name)
    {
        $this->id = $id;
        $this->value = $value;
        $this->name = $name;
    }
}