<?php
namespace ICARICCU\PEB\Models;

abstract class AbstractProperty
{
    /**
     * @var PropertyId
     */
    public $id;
    /**
     * @var string
     */
    public $type;
    /**
     * @var ICARICCU\PEB\Models\PropertyValue
     */
    public $value;
    /**
     * @var Label
     */
    public $name;

    /**
     * @var boolean
     */
    public $multivalue = false;

    /**
     * @var string
     */
    public $inverseOf = null;

    /**
     * @var boolean
     */
    public $mandatory = false;

    /**
     * @var integer
     */
    public $order = 1;

    /**
     * @param PropertyId $id
     * @param PropertyValue $value
     * @param Label $name
     */
    public function __construct(PropertyId $id, PropertyValue $value, Label $name, $order)
    {
        $this->id = $id;
        $this->value = $value;
        $this->name = $name;
        $this->order = $order;
    }
}

