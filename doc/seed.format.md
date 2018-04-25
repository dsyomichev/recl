```
[
    name:string;
    tables?:[
        {
            name:string;
            primaryKey:string;
            shards?: number;
            replicas?: number | { };
            primaryReplicaTag?: string;

            indexes:[
                {
                    name: string;
                    multi?: boolean;
                    geo?: boolean;
                }
            ]

            documents:[
                {
                    object: { };
                    durability?: string;
                    returnChanges?: boolean | string;
                    conflict?: string;
                }
            ]
        }
    ]
]
```
