<?php
namespace ICARICCU\PEB\Services\OwlTransformers;


interface Transformer
{
    public function transform($node, $xpath, $namespaces, $properties = null, $ontologyUri);
}
