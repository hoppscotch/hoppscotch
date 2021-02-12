<template>
    <div v-if="show">
        <tabs styles="m-4" :id="'collections_tab'" v-on:tab-changed="updateCollectionsType">
            <tab
                :id="'my-collections'"
                :label="'My Collections'"
                :selected="true"
            >
            </tab>
            <tab
                :id="'team-collections'"
                :label="'Team Collections'"
            >
                <ul>
                    <li>
                        <label for="select_team"> Select Team: </label>
                        <span class="select-wrapper">
                            <select 
                            type="text" 
                            id="team"
                            class="team"
                            autofocus
                            @change=" 
                                collectionsType.selectedTeam = myTeams[$event.target.value];
                                $emit('collectionsType-updated');
                            "
                            >
                                <option
                                :key="undefined"
                                :value="undefined"
                                hidden disabled selected
                                >
                                Select team
                                </option>
                                <option
                                v-for="(team, index) in myTeams"
                                :key="index"
                                :value="index"
                                >
                                {{ team.name }}
                                </option>
                            </select>
                        </span>
                    </li>
                </ul>
            </tab>
        </tabs>

    </div>
</template>

<script>
import gql from "graphql-tag"

export default {
    props: {
        collectionsType: Object,
        show: Boolean
    },
    apollo: {    
        myTeams: {
            query: gql`
                query GetMyTeams {
                    myTeams {
                        id
                        name
                    }
                }
            `,
            pollInterval: 10000,
        }
    },
    methods: {
        updateCollectionsType(tabID) {
            this.collectionsType.type = tabID
            this.$emit('collectionsType-updated');

        }
    }
}
</script>
