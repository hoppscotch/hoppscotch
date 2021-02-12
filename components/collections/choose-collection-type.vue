<template>
    <div v-if="show">
        <tabs style="m-4" :id="'collections_tab'" v-on:tab-changed="updateCollectionsType">
            <tab
                :id="'my-collections'"
                :label="'My Collections'"
                :selected="true"
            >
            </tab>
            <tab
                :id="'team-collections'"
                :label="'Team Collections'"
                :selected="false"
            >
                <ul>
                    <li>
                        <label for="select_team"> Select Team: </label>
                        <span class="select-wrapper">
                            <select 
                            type="text" 
                            id="team"
                            class="team"
                            v-model="selectedTeam"
                            autofocus
                            >
                                <option
                                v-for="(team, index) in myTeams"
                                :key="index"
                                :value="team"
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
import tabs from '../ui/tabs';
import gql from "graphql-tag"

var teamCollectionsTab = document.getElementById('team-collections')

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
    computed: {
        selectedTeam() {
            if(this.myTeams == null) return {name: 'Loading'}
            if(this.collectionsType.selectedTeam == null) {
                this.collectionsType.selectedTeam = this.myTeams[0]
                this.$emit('collectionsType-updated');
            }
            return this.collectionsType.selectedTeam
        },
    },
    methods: {
        updateCollectionsType(tabID) {
            this.collectionsType.type = tabID
            this.$emit('collectionsType-updated');

        }
    }
}
</script>